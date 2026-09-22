from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserMeResponse
from backend.services.auth import AuthService


router = APIRouter()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post("/api/auth/register", response_model=AuthResponse)
def register(payload: RegisterRequest, auth: AuthService = Depends(get_auth_service)):
    try:
        user = auth.register(payload.email, payload.password)
        _, token = auth.login(payload.email, payload.password)
        return AuthResponse(token=token, email=user.email, user_id=user.id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, auth: AuthService = Depends(get_auth_service)):
    try:
        user, token = auth.login(payload.email, payload.password)
        return AuthResponse(token=token, email=user.email, user_id=user.id)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@router.post("/api/auth/logout")
def logout(token: str = "", auth: AuthService = Depends(get_auth_service)):
    if not token:
        raise HTTPException(status_code=400, detail="Token nao fornecido")
    auth.logout(token)
    return {"message": "Logout realizado com sucesso"}


@router.get("/api/auth/me", response_model=UserMeResponse)
def me(token: str = "", auth: AuthService = Depends(get_auth_service)):
    if not token:
        raise HTTPException(status_code=401, detail="Token nao fornecido")
    user = auth.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token invalido ou expirado")
    return UserMeResponse(email=user.email, user_id=user.id)