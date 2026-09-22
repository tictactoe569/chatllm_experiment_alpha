const API_BASE = window.location.origin;

// ── Auth ──────────────────────────────────────────────────────────────────────

async function apiAuth(method, endpoint, body) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("auth_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Erro ${response.status}`);
  }
  return data;
}

async function register(email, password) {
  return apiAuth("POST", "/api/auth/register", { email, password });
}

async function login(email, password) {
  return apiAuth("POST", "/api/auth/login", { email, password });
}

async function logout() {
  const token = localStorage.getItem("auth_token");
  return apiAuth("POST", `/api/auth/logout?token=${encodeURIComponent(token || "")}`);
}

async function fetchMe() {
  const token = localStorage.getItem("auth_token");
  if (!token) return null;
  return apiAuth("GET", `/api/auth/me?token=${encodeURIComponent(token)}`);
}

// ── Chat ──────────────────────────────────────────────────────────────────────

async function sendMessageStream({ message, history, sessionId, onDelta, signal }) {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, session_id: sessionId }),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body?.detail || "Erro ao enviar mensagem para o servidor.";
    throw new Error(detail);
  }

  if (!response.body) {
    throw new Error("Streaming nao suportado no ambiente atual.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const rawEvent of events) {
      const line = rawEvent
        .split("\n")
        .find((part) => part.startsWith("data:"));
      if (!line) continue;

      const payloadText = line.slice(5).trim();
      if (!payloadText) continue;

      let payload;
      try {
        payload = JSON.parse(payloadText);
      } catch {
        continue;
      }

      if (payload.error) {
        throw new Error(payload.error);
      }

      if (payload.delta) {
        onDelta(payload.delta);
      }
    }
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────────

async function fetchSessions() {
  const response = await fetch(`${API_BASE}/api/sessions`);
  if (!response.ok) throw new Error("Erro ao listar sessoes");
  return response.json();
}

async function createSession(title) {
  const response = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title || "" }),
  });
  if (!response.ok) throw new Error("Erro ao criar sessao");
  return response.json();
}

async function updateSessionTitle(sessionId, title) {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error("Erro ao atualizar titulo");
  return response.json();
}

async function deleteSession(sessionId) {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Erro ao deletar sessao");
  return response.json();
}

async function fetchSessionMessages(sessionId) {
  const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`);
  if (!response.ok) throw new Error("Erro ao carregar mensagens");
  return response.json();
}
