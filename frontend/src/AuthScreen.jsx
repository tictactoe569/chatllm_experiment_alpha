const { useState } = React;

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanedUser = username.trim();
    const cleanedPass = password;

    if (!cleanedUser || !cleanedPass) {
      setError("Preencha todos os campos.");
      return;
    }

    if (mode === "register") {
      if (cleanedPass !== confirmPassword) {
        setError("As senhas nao conferem.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "register") {
        await registerUser(cleanedUser, cleanedPass);
        // Apos registrar, faz login automatico
        await loginUser(cleanedUser, cleanedPass);
      } else {
        await loginUser(cleanedUser, cleanedPass);
      }
      onAuthenticated();
    } catch (err) {
      setError(err.message || "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h1 className="auth-title">ChatLLM Lab</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Entre com sua conta" : "Crie uma nova conta"}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="auth-username">Nome de usuario</label>
            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Seu nome de usuario"
              autoComplete="username"
              minLength={3}
              maxLength={80}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Senha</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={8}
              maxLength={128}
              required
            />
          </div>

          {mode === "register" && (
            <div className="auth-field">
              <label htmlFor="auth-confirm">Confirmar senha</label>
              <input
                id="auth-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login"
            ? "Nao tem conta? "
            : "Ja tem conta? "}
          <a href="#" onClick={(e) => { e.preventDefault(); switchMode(); }}>
            {mode === "login" ? "Cadastre-se" : "Faca login"}
          </a>
        </p>
      </div>
    </div>
  );
}