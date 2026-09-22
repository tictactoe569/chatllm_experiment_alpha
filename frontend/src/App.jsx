const { useEffect, useMemo, useRef, useState } = React;

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fn = mode === "login" ? login : register;
      const data = await fn(email, password);
      localStorage.setItem("auth_token", data.token);
      onAuthSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">ChatLLM Lab</div>
      </header>
      <div className="auth-screen">
        <div className="auth-card">
          <h2>{mode === "login" ? "Entrar" : "Cadastrar"}</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={1}
            />
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
            </button>
          </form>
          <p className="auth-toggle">
            {mode === "login" ? (
              <>Nao tem conta? <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); setError(""); }}>Cadastre-se</a></>
            ) : (
              <>Ja tem conta? <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setError(""); }}>Entrar</a></>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}

function Sidebar({ sessions, activeSessionId, onSelectSession, onCreateSession, onDeleteSession, onRenameSession }) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  const handleStartEdit = (session) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleFinishEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onCreateSession} title="Nova conversa">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/></svg>
          Nova conversa
        </button>
      </div>
      <div className="sidebar-list">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`sidebar-item ${s.id === activeSessionId ? "active" : ""}`}
            onClick={() => onSelectSession(s.id)}
          >
            {editingId === s.id ? (
              <input
                ref={inputRef}
                className="sidebar-edit-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleFinishEdit}
                onKeyDown={(e) => { if (e.key === "Enter") handleFinishEdit(); }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="sidebar-item-title" onDoubleClick={() => handleStartEdit(s)}>
                  {s.title || "Nova conversa"}
                </span>
                <button
                  className="sidebar-item-del"
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
                  title="Deletar"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    fetchMe()
      .then((data) => {
        if (data) setUser(data);
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, []);

  // Load sessions on mount
  useEffect(() => {
    if (!user) return;
    fetchSessions().then((data) => {
      setSessions(data);
      if (data.length > 0) {
        setActiveSessionId(data[0].id);
      }
    }).catch(() => {});
  }, [user]);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    fetchSessionMessages(activeSessionId).then((data) => {
      setMessages(
        data.messages.map((m) => ({
          id: createMessageId(),
          role: m.role,
          content: m.content,
        }))
      );
    }).catch(() => {});
  }, [activeSessionId]);

  const chatHistory = useMemo(
    () => messages.filter((msg) => msg.role === "user" || msg.role === "assistant"),
    [messages]
  );

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const onStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setBusy(false);
  };

  const handleCreateSession = async () => {
    try {
      const session = await createSession("");
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRenameSession = async (sessionId, title) => {
    try {
      const updated = await updateSessionTitle(sessionId, title);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
  };

  const onSubmit = async (event, inputRef) => {
    event.preventDefault();
    const cleaned = text.trim();
    if (!cleaned || busy) return;

    // Auto-create session if none active
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await createSession("");
        setSessions((prev) => [session, ...prev]);
        sessionId = session.id;
        setActiveSessionId(session.id);
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    setError("");
    const userMessage = { id: createMessageId(), role: "user", content: cleaned };
    const assistantMessageId = createMessageId();

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);
    setText("");
    setBusy(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await sendMessageStream({
        message: cleaned,
        history: chatHistory,
        sessionId,
        signal: abortController.signal,
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: `${msg.content}${delta}` }
                : msg
            )
          );
        },
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId && !msg.content.trim()
            ? { ...msg, content: "Nao foi possivel obter resposta do modelo agora." }
            : msg
        )
      );

      // Refresh sessions to get updated title
      const data = await fetchSessions();
      setSessions(data);
    } catch (err) {
      const aborted = err?.name === "AbortError";
      if (!aborted) {
        setError(err.message || "Falha inesperada ao gerar resposta.");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content.trim() ? msg.content : "Nao foi possivel obter resposta do modelo agora." }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId && !msg.content.trim()
              ? { ...msg, content: "Resposta interrompida." }
              : msg
          )
        );
      }
    } finally {
      abortControllerRef.current = null;
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    localStorage.removeItem("auth_token");
    setUser(null);
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
  };

  if (checkingAuth) return null;

  if (!user) {
    return <AuthScreen onAuthSuccess={setUser} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
      />
      <main className="app-main">
        <header className="app-header">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
            </svg>
          </button>
          <div className="brand">ChatLLM Lab</div>
          <div className="header-right">
            <span className="user-email">{user.email}</span>
            <button className="logout-btn" onClick={handleLogout}>Sair</button>
          </div>
        </header>

        <section className="messages" aria-live="polite" ref={messagesRef}>
          <div className="messages-inner">
            {messages.length === 0 && (
              <div className="welcome-msg">
                <p>Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?</p>
              </div>
            )}
            {messages.map((msg) => (
              <article key={msg.id} className={`bubble ${msg.role}`}>
                <MessageContent content={msg.content} />
              </article>
            ))}
          </div>
        </section>

        <Composer
          text={text}
          busy={busy}
          error={error}
          onChangeText={setText}
          onSubmit={onSubmit}
          onStop={onStop}
        />

        <div className="warning-banner">Lembre-se, voce precisa focar no experimento!!!</div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

