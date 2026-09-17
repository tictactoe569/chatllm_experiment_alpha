from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.config import OPENROUTER_MODEL_DEFAULT
from backend.database import get_db
from backend.models import ChatMessage, ChatSession
from backend.routers.auth import get_current_user
from backend.schemas.chat import ChatRequest, ChatResponse
from backend.services.openrouter import OpenRouterConfigError, generate_reply, stream_reply


router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


def _get_or_create_session(db: Session, session_id: int | None, user_id: int) -> ChatSession:
    if session_id:
        session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    else:
        session = ChatSession(user_id=user_id)
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


def _generate_title_from_reply(reply: str) -> str:
    first_line = reply.strip().split("\n")[0] if reply else ""
    title = first_line[:60].strip()
    if not title:
        return "Nova conversa"
    title = title.rstrip(".,;:!?")
    if len(title) > 55:
        title = title[:55] + "..."
    return title


@router.post("/api/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    session_id: int | None = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    try:
        reply, model_name = await generate_reply(
            user_message=payload.message,
            history=[item.model_dump() for item in payload.history],
            model=payload.model,
        )
    except OpenRouterConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    resolved_model = payload.model or model_name or OPENROUTER_MODEL_DEFAULT

    session = _get_or_create_session(db, session_id, current_user.id)

    if not session.title:
        session.title = _generate_title_from_reply(reply)
        session.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.add(ChatMessage(session_id=session.id, role="user", content=payload.message, model=resolved_model))
    db.add(ChatMessage(session_id=session.id, role="assistant", content=reply, model=resolved_model))
    db.commit()

    return ChatResponse(reply=reply, model=resolved_model)


@router.post("/api/chat/stream")
async def chat_stream(
    payload: ChatRequest,
    session_id: int | None = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    resolved_model = payload.model or OPENROUTER_MODEL_DEFAULT

    session = _get_or_create_session(db, session_id, current_user.id)
    session_id_val = session.id
    session_title = session.title

    async def event_generator():
        nonlocal session_title
        full_reply = ""
        try:
            async for delta in stream_reply(
                user_message=payload.message,
                history=[item.model_dump() for item in payload.history],
                model=payload.model,
            ):
                full_reply += delta
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=True)}\n\n"
        except OpenRouterConfigError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=True)}\n\n"
            return
        except RuntimeError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=True)}\n\n"
            return

        if full_reply.strip():
            if not session_title:
                session_title = _generate_title_from_reply(full_reply)
                db.query(ChatSession).filter(ChatSession.id == session_id_val).update(
                    {"title": session_title, "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)}
                )

            db.add(ChatMessage(session_id=session_id_val, role="user", content=payload.message, model=resolved_model))
            db.add(ChatMessage(session_id=session_id_val, role="assistant", content=full_reply, model=resolved_model))
            db.commit()

        yield f"data: {json.dumps({'done': True, 'session_id': session_id_val, 'title': session_title}, ensure_ascii=True)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
