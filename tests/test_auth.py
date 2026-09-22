from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.models import User, UserSession


class TestAuthRegister:
    def test_register_success(self, client: TestClient):
        response = client.post(
            "/api/auth/register",
            json={"email": "teste@email.com", "password": "123456"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == "teste@email.com"
        assert "user_id" in data

    def test_register_duplicate_email(self, client: TestClient):
        client.post(
            "/api/auth/register",
            json={"email": "dup@email.com", "password": "123456"},
        )
        response = client.post(
            "/api/auth/register",
            json={"email": "dup@email.com", "password": "654321"},
        )
        assert response.status_code == 409
        assert "ja cadastrado" in response.json()["detail"]

    def test_register_empty_email(self, client: TestClient):
        response = client.post(
            "/api/auth/register",
            json={"email": "", "password": "123456"},
        )
        assert response.status_code == 422

    def test_register_empty_password(self, client: TestClient):
        response = client.post(
            "/api/auth/register",
            json={"email": "teste@email.com", "password": ""},
        )
        assert response.status_code == 422


class TestAuthLogin:
    def test_login_success(self, client: TestClient):
        client.post(
            "/api/auth/register",
            json={"email": "login@email.com", "password": "123456"},
        )
        response = client.post(
            "/api/auth/login",
            json={"email": "login@email.com", "password": "123456"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == "login@email.com"

    def test_login_wrong_password(self, client: TestClient):
        client.post(
            "/api/auth/register",
            json={"email": "wrong@email.com", "password": "123456"},
        )
        response = client.post(
            "/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrong"},
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        response = client.post(
            "/api/auth/login",
            json={"email": "naoexiste@email.com", "password": "123456"},
        )
        assert response.status_code == 401


class TestAuthLogout:
    def test_logout_success(self, client: TestClient):
        resp = client.post(
            "/api/auth/register",
            json={"email": "logout@email.com", "password": "123456"},
        )
        token = resp.json()["token"]

        response = client.post(f"/api/auth/logout?token={token}")
        assert response.status_code == 200
        assert response.json()["message"] == "Logout realizado com sucesso"

    def test_logout_without_token(self, client: TestClient):
        response = client.post("/api/auth/logout")
        assert response.status_code == 400

    def test_logout_invalid_token(self, client: TestClient):
        response = client.post("/api/auth/logout?token=token_invalido")
        assert response.status_code == 200  # apenas deleta se existir


class TestAuthMe:
    def test_me_authenticated(self, client: TestClient):
        resp = client.post(
            "/api/auth/register",
            json={"email": "me@email.com", "password": "123456"},
        )
        token = resp.json()["token"]

        response = client.get(f"/api/auth/me?token={token}")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "me@email.com"
        assert "user_id" in data

    def test_me_without_token(self, client: TestClient):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_me_invalid_token(self, client: TestClient):
        response = client.get("/api/auth/me?token=token_invalido")
        assert response.status_code == 401

    def test_me_after_logout(self, client: TestClient):
        resp = client.post(
            "/api/auth/register",
            json={"email": "poslogout@email.com", "password": "123456"},
        )
        token = resp.json()["token"]

        client.post(f"/api/auth/logout?token={token}")

        response = client.get(f"/api/auth/me?token={token}")
        assert response.status_code == 401