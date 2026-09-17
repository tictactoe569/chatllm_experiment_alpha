from __future__ import annotations

import uuid
from datetime import datetime, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
from backend.schemas.auth import AuthResponse, UserCreate, UserLogin, UserResponse

router = APIRouter()

# Simple in-memory token store: token -> user_id
_active_tokens: dict[str, int] = {}


def get_current_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token nao fornecido")

    token = authorization.removeprefix("Bearer ").strip()
    user_id = _active_tokens.get(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token invalido ou expirado")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado")

    return user


@router.post("/api/auth/register", response_model=AuthResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> AuthResponse:
    if len(payload.password) < 4:
        raise HTTPException(status_code=422, detail="Senha deve ter no minimo 4 caracteres")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email ja cadastrado")

    password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    user = User(email=payload.email, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = str(uuid.uuid4())
    _active_tokens[token] = user.id

    return AuthResponse(user=UserResponse.model_validate(user), token=token)


@router.post("/api/auth/login", response_model=AuthResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    if not bcrypt.checkpw(payload.password.encode("utf-8"), user.password_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    token = str(uuid.uuid4())
    _active_tokens[token] = user.id

    return AuthResponse(user=UserResponse.model_validate(user), token=token)


@router.post("/api/auth/logout")
def logout(authorization: str | None = Header(None)) -> dict[str, str]:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        _active_tokens.pop(token, None)

    return {"status": "ok"}


@router.get("/api/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)