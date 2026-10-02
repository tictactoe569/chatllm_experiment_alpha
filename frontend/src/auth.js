const AUTH_API = window.location.origin + "/auth";

async function authFetch(path, body) {
  const res = await fetch(`${AUTH_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Erro de autenticacao.");
  }
  return data;
}

function getStoredToken() {
  return localStorage.getItem("chatllm_token");
}

function storeToken(token) {
  localStorage.setItem("chatllm_token", token);
}

function clearToken() {
  localStorage.removeItem("chatllm_token");
}

function getAuthHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function registerUser(username, password) {
  return authFetch("/register", { username, password });
}

async function loginUser(username, password) {
  const data = await authFetch("/login", { username, password });
  storeToken(data.access_token);
  return data;
}

function logoutUser() {
  clearToken();
}

function isLoggedIn() {
  return !!getStoredToken();
}