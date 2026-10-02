const SESSIONS_API = window.location.origin + "/api/sessions";

async function fetchSessions() {
  const res = await fetch(SESSIONS_API, { headers: { ...getAuthHeaders() } });
  if (!res.ok) throw new Error("Erro ao carregar sessoes.");
  return res.json();
}

async function createSession() {
  const res = await fetch(SESSIONS_API, {
    method: "POST",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Erro ao criar sessao.");
  return res.json();
}

async function deleteSessionApi(sessionId) {
  const res = await fetch(`${SESSIONS_API}/${sessionId}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Erro ao deletar sessao.");
}