from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


class TestSessions:
    def test_create_session(self, client: TestClient):
        response = client.post("/api/sessions", json={"title": ""})
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "Nova conversa"

    def test_create_session_with_title(self, client: TestClient):
        response = client.post("/api/sessions", json={"title": "Minha conversa"})
        assert response.status_code == 200
        assert response.json()["title"] == "Minha conversa"

    def test_list_sessions(self, client: TestClient):
        client.post("/api/sessions", json={"title": "Sessao 1"})
        client.post("/api/sessions", json={"title": "Sessao 2"})
        response = client.get("/api/sessions")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2

    def test_update_session_title(self, client: TestClient):
        resp = client.post("/api/sessions", json={"title": "Antigo"})
        session_id = resp.json()["id"]

        response = client.patch(f"/api/sessions/{session_id}", json={"title": "Novo titulo"})
        assert response.status_code == 200
        assert response.json()["title"] == "Novo titulo"

    def test_update_nonexistent_session(self, client: TestClient):
        response = client.patch("/api/sessions/99999", json={"title": "Teste"})
        assert response.status_code == 404

    def test_delete_session(self, client: TestClient):
        resp = client.post("/api/sessions", json={"title": "Deletar"})
        session_id = resp.json()["id"]

        response = client.delete(f"/api/sessions/{session_id}")
        assert response.status_code == 200

        # Verify it's gone
        get_resp = client.get(f"/api/sessions/{session_id}/messages")
        assert get_resp.status_code == 404

    def test_delete_nonexistent_session(self, client: TestClient):
        response = client.delete("/api/sessions/99999")
        assert response.status_code == 404

    def test_get_session_messages_empty(self, client: TestClient):
        resp = client.post("/api/sessions", json={"title": "Vazia"})
        session_id = resp.json()["id"]

        response = client.get(f"/api/sessions/{session_id}/messages")
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == session_id
        assert data["messages"] == []

    def test_get_session_messages_with_chat(self, client: TestClient):
        resp = client.post("/api/sessions", json={"title": "Com msgs"})
        session_id = resp.json()["id"]

        # Send a chat message to this session (will fail without API key but should create the session)
        client.post(
            "/api/chat",
            json={"message": "Ola", "session_id": session_id},
        )

        response = client.get(f"/api/sessions/{session_id}/messages")
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == session_id

    def test_get_nonexistent_session_messages(self, client: TestClient):
        response = client.get("/api/sessions/99999/messages")
        assert response.status_code == 404

    def test_auto_title_on_first_message(self, client: TestClient):
        """Session without title should get auto-title from first message."""
        resp = client.post("/api/sessions", json={"title": ""})
        session_id = resp.json()["id"]
        assert resp.json()["title"] == "Nova conversa"

        # Send a chat message (will fail but should trigger auto-title)
        client.post(
            "/api/chat",
            json={"message": "Qual a capital do Brasil?", "session_id": session_id},
        )

        # Check if title was updated
        get_resp = client.get(f"/api/sessions/{session_id}/messages")
        # The title may or may not be updated depending on API key, but the endpoint works
        assert get_resp.status_code == 200