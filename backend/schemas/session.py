from __future__ import annotations

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    title: str = Field(default="", max_length=255)


class SessionUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class SessionResponse(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]


class SessionMessagesResponse(BaseModel):
    session_id: int
    title: str
    messages: list[dict]