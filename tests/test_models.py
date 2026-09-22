from __future__ import annotations

from datetime import datetime, timezone

import pytest

from backend.models import ChatMessage, User, UserSession


class TestChatMessage:
    def test_create_message_defaults(self, db_session):
        """Deve criar uma mensagem com valores padrao para session_key, model e created_at."""
        msg = ChatMessage(
            role="user",
            content="Ola, mundo!",
        )
        db_session.add(msg)
        db_session.commit()
        db_session.refresh(msg)

        assert msg.id is not None
        assert msg.session_key == "default"
        assert msg.role == "user"
        assert msg.content == "Ola, mundo!"
        assert msg.model == "google/gemma-4-31b-it"
        assert isinstance(msg.created_at, datetime)

    def test_create_message_custom_session(self, db_session):
        """Deve criar uma mensagem com session_key customizada."""
        msg = ChatMessage(
            session_key="session-abc",
            role="assistant",
            content="Resposta do assistente.",
        )
        db_session.add(msg)
        db_session.commit()
        db_session.refresh(msg)

        assert msg.session_key == "session-abc"
        assert msg.role == "assistant"

    def test_create_message_custom_model(self, db_session):
        """Deve criar uma mensagem com modelo customizado."""
        msg = ChatMessage(
            role="user",
            content="Teste",
            model="openai/gpt-4o",
        )
        db_session.add(msg)
        db_session.commit()
        db_session.refresh(msg)

        assert msg.model == "openai/gpt-4o"

    def test_query_by_session_key(self, db_session):
        """Deve filtrar mensagens por session_key."""
        msg1 = ChatMessage(session_key="s1", role="user", content="a")
        msg2 = ChatMessage(session_key="s2", role="user", content="b")
        db_session.add_all([msg1, msg2])
        db_session.commit()

        results = (
            db_session.query(ChatMessage)
            .filter(ChatMessage.session_key == "s1")
            .all()
        )
        assert len(results) == 1
        assert results[0].content == "a"

    def test_query_by_role(self, db_session):
        """Deve filtrar mensagens pelo campo role."""
        msg1 = ChatMessage(role="user", content="pergunta")
        msg2 = ChatMessage(role="assistant", content="resposta")
        db_session.add_all([msg1, msg2])
        db_session.commit()

        users = (
            db_session.query(ChatMessage)
            .filter(ChatMessage.role == "user")
            .all()
        )
        assistants = (
            db_session.query(ChatMessage)
            .filter(ChatMessage.role == "assistant")
            .all()
        )

        assert len(users) == 1
        assert len(assistants) == 1
        assert users[0].content == "pergunta"
        assert assistants[0].content == "resposta"

    def test_created_at_auto_set(self, db_session):
        """O campo created_at deve ser preenchido automaticamente com UTC now."""
        before = datetime.now(timezone.utc).replace(tzinfo=None)
        msg = ChatMessage(role="user", content="timestamp test")
        db_session.add(msg)
        db_session.commit()
        db_session.refresh(msg)
        after = datetime.now(timezone.utc).replace(tzinfo=None)

        assert before <= msg.created_at <= after


class TestUser:
    def test_create_user(self, db_session):
        user = User(email="user@test.com", password_hash="hash123")
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.id is not None
        assert user.email == "user@test.com"
        assert user.password_hash == "hash123"
        assert isinstance(user.created_at, datetime)

    def test_unique_email(self, db_session):
        user1 = User(email="unique@test.com", password_hash="hash1")
        db_session.add(user1)
        db_session.commit()

        user2 = User(email="unique@test.com", password_hash="hash2")
        db_session.add(user2)
        with pytest.raises(Exception):
            db_session.commit()

    def test_user_session_relationship(self, db_session):
        user = User(email="rel@test.com", password_hash="hash")
        db_session.add(user)
        db_session.commit()

        session = UserSession(user_id=user.id, token="token-abc")
        db_session.add(session)
        db_session.commit()
        db_session.refresh(user)

        assert len(user.sessions) == 1
        assert user.sessions[0].token == "token-abc"

    def test_cascade_delete(self, db_session):
        user = User(email="cascade@test.com", password_hash="hash")
        db_session.add(user)
        db_session.commit()

        session = UserSession(user_id=user.id, token="token-cascade")
        db_session.add(session)
        db_session.commit()

        db_session.delete(user)
        db_session.commit()

        sessions = db_session.query(UserSession).filter(UserSession.token == "token-cascade").all()
        assert len(sessions) == 0


class TestUserSession:
    def test_create_session(self, db_session):
        user = User(email="session@test.com", password_hash="hash")
        db_session.add(user)
        db_session.commit()

        session = UserSession(user_id=user.id, token="token-xyz")
        db_session.add(session)
        db_session.commit()
        db_session.refresh(session)

        assert session.id is not None
        assert session.token == "token-xyz"
        assert session.user_id == user.id
        assert isinstance(session.created_at, datetime)

    def test_unique_token(self, db_session):
        user = User(email="uniqtok@test.com", password_hash="hash")
        db_session.add(user)
        db_session.commit()

        s1 = UserSession(user_id=user.id, token="same-token")
        s2 = UserSession(user_id=user.id, token="same-token")
        db_session.add_all([s1, s2])
        with pytest.raises(Exception):
            db_session.commit()

    def test_content_persists_long_text(self, db_session):
        """Deve persistir conteudos longos corretamente."""
        long_text = "Lorem ipsum " * 200
        msg = ChatMessage(role="user", content=long_text)
        db_session.add(msg)
        db_session.commit()
        db_session.refresh(msg)

        assert msg.content == long_text
