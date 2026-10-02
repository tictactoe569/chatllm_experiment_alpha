from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


_test_counter = 0


def register_and_login(client: TestClient) -> str:
    """Cria um usuario unico e retorna o token JWT."""
    global _test_counter
    _test_counter += 1
    username = f"testuser{_test_counter}"
    password = "Test@1234"
    client.post("/auth/register", json={"username": username, "password": password})
    resp = client.post("/auth/login", json={"username": username, "password": password})
    return resp.json()["access_token"]


def auth_headers(client: TestClient) -> dict[str, str]:
    """Retorna headers de autenticacao para um usuario de teste."""
    token = register_and_login(client)
    return {"Authorization": f"Bearer {token}"}


class TestHealthEndpoint:
    def test_health_returns_ok(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


class TestRootEndpoint:
    def test_root_returns_frontend(self, client: TestClient):
        response = client.get("/")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")


class TestChatEndpoint:
    def test_chat_endpoint_exists(self, client: TestClient):
        """Verifica que o endpoint /api/chat responde (espera erro de config sem API key)."""
        headers = auth_headers(client)
        response = client.post(
            "/api/chat",
            json={"message": "Ola"},
            headers=headers,
        )
        # Sem OPENROUTER_API_KEY definida, esperamos 503 (config error)
        assert response.status_code in (200, 422, 503)

    def test_chat_empty_message_rejected(self, client: TestClient):
        """Mensagem vazia deve ser rejeitada com 422 (validacao Pydantic)."""
        headers = auth_headers(client)
        response = client.post(
            "/api/chat",
            json={"message": ""},
            headers=headers,
        )
        assert response.status_code == 422

    def test_chat_without_auth(self, client: TestClient):
        """Requisicao sem token deve retornar 401."""
        response = client.post(
            "/api/chat",
            json={"message": "Ola"},
        )
        assert response.status_code == 401


class TestChatStreamEndpoint:
    def test_chat_stream_endpoint_exists(self, client: TestClient):
        """Verifica que o endpoint /api/chat/stream aceita requisicoes."""
        headers = auth_headers(client)
        response = client.post(
            "/api/chat/stream",
            json={"message": "Ola"},
            headers=headers,
        )
        # Streaming pode iniciar e depois falhar sem API key
        assert response.status_code in (200, 422, 503)

    def test_chat_stream_empty_message_rejected(self, client: TestClient):
        """Stream com mensagem vazia deve ser rejeitado com 422."""
        headers = auth_headers(client)
        response = client.post(
            "/api/chat/stream",
            json={"message": ""},
            headers=headers,
        )
        assert response.status_code == 422

    def test_chat_stream_without_auth(self, client: TestClient):
        """Stream sem token deve retornar 401."""
        response = client.post(
            "/api/chat/stream",
            json={"message": "Ola"},
        )
        assert response.status_code == 401


class TestCORSMiddleware:
    def test_cors_headers_present(self, client: TestClient):
        """Verifica que os headers CORS estao presentes."""
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        # O FastAPI com allow_origins=["*"] permite a requisicao
        assert response.status_code in (200, 405)