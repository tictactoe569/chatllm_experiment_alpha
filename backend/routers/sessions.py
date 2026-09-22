from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import ChatMessage, ChatSession
from backend.schemas.session import SessionCreate, SessionResponse, SessionUpdate


router = APIRouter()


def _session_to_response(s: ChatSession) -> SessionResponse:
    return SessionResponse(
        id=s.id,
        title=s.title,
        created_at=s.created_at.isoformat(),
        updated_at=s.updated_at.isoformat(),
    )


def _generate_auto_title(content: str) -> str:
    """Generate an automatic title from the first user message."""
    title = content.strip().replace("\n", " ")[:60]
    if len(content) > 60:
        title += "..."
    return title if title else "Nova conversa"


@router.get("/api/sessions", response_model=list[SessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    sessions = (
        db.query(ChatSession)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return [_session_to_response(s) for s in sessions]


@router.post("/api/sessions", response_model=SessionResponse)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    session = ChatSession(title=payload.title or "Nova conversa")
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_to_response(session)


@router.patch("/api/sessions/{session_id}", response_model=SessionResponse)
def update_session(session_id: int, payload: SessionUpdate, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    session.title = payload.title
    session.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(session)
    return _session_to_response(session)


@router.delete("/api/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    # Delete all messages in the session
    db.query(ChatMessage).filter(ChatMessage.session_key == str(session_id)).delete()
    db.delete(session)
    db.commit()
    return {"message": "Sessao deletada com sucesso"}


@router.get("/api/sessions/{session_id}/messages")
def get_session_messages(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_key == str(session_id))
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return {
        "session_id": session.id,
        "title": session.title,
        "messages": [
            {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
            for m in messages
        ],
    }