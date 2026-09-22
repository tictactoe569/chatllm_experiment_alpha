from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.models import User, UserSession


def _hash_password(password: str) -> str:
    """Hash a password using PBKDF2-SHA256 with a random salt."""
    salt = os.urandom(32)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600_000)
    return salt.hex() + ":" + dk.hex()


def _verify_password(password: str, stored: str) -> bool:
    """Verify a password against a stored hash."""
    salt_hex, dk_hex = stored.split(":", 1)
    salt = bytes.fromhex(salt_hex)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600_000)
    return secrets.compare_digest(dk.hex(), dk_hex)


def _generate_token() -> str:
    return secrets.token_hex(48)


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, email: str, password: str) -> User:
        existing = self.db.query(User).filter(User.email == email).first()
        if existing:
            raise ValueError("Email ja cadastrado")

        user = User(email=email, password_hash=_hash_password(password))
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def login(self, email: str, password: str) -> tuple[User, str]:
        user = self.db.query(User).filter(User.email == email).first()
        if not user or not _verify_password(password, user.password_hash):
            raise ValueError("Email ou senha invalidos")

        token = _generate_token()
        session = UserSession(user_id=user.id, token=token)
        self.db.add(session)
        self.db.commit()
        return user, token

    def logout(self, token: str) -> None:
        session = self.db.query(UserSession).filter(UserSession.token == token).first()
        if session:
            self.db.delete(session)
            self.db.commit()

    def get_user_by_token(self, token: str) -> User | None:
        session = self.db.query(UserSession).filter(UserSession.token == token).first()
        if session:
            return session.user
        return None