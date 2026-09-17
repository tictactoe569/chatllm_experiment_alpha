const { useState } = React;

function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanedEmail = email.trim();
    const cleanedPassword = password.trim();

    if (!cleanedEmail || !cleanedPassword) {
      setError("Preencha todos os campos.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanedEmail, password: cleanedPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Erro ao autenticar.");
        return;
      }

      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError("Erro de conexao com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">ChatLLM Lab</div>
      </header>
      <div className="auth-container">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{isLogin ? "Entrar" : "Criar Conta"}</h2>

          {error && <div className="auth-error">{error}</div>}

          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={loading}
              autoFocus
            />
          </label>

          <label className="auth-label">
            Senha
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              disabled={loading}
            />
          </label>

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Aguarde..." : isLogin ? "Entrar" : "Cadastrar"}
          </button>

          <p className="auth-toggle">
            {isLogin ? "Nao tem conta?" : "Ja tem conta?"}{" "}
            <button type="button" className="auth-link" onClick={toggleMode} disabled={loading}>
              {isLogin ? "Cadastre-se" : "Faca login"}
            </button>
          </p>
        </form>
      </div>
      <div className="warning-banner">Lembre-se, voce precisa focar no experimento!!!</div>
    </main>
  );
}