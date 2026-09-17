const { useEffect, useMemo, useRef, useState, useCallback } = React;

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const WELCOME_MESSAGE = {
  id: createMessageId(),
  role: "assistant",
  content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
};

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("auth_token") || null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([{ ...WELCOME_MESSAGE }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesRef = useRef(null);
  const abortControllerRef = useRef(null);

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

  // Load sessions on login
  useEffect(() => {
    if (user) {
      apiListSessions().then(setSessions).catch(() => {});
    }
  }, [user]);

  const loadSessionMessages = useCallback(async (sessionId) => {
    try {
      const msgs = await apiGetSessionMessages(sessionId);
      if (msgs.length === 0) {
        setMessages([{ ...WELCOME_MESSAGE, id: createMessageId() }]);
      } else {
        setMessages(msgs.map((m) => ({ id: `${m.id}`, role: m.role, content: m.content })));
      }
    } catch {
      setMessages([{ ...WELCOME_MESSAGE, id: createMessageId() }]);
    }
  }, []);

  const onAuthSuccess = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = async () => {
    await apiLogout().catch(() => {});
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    setToken(null);
    setSessions([]);
    setActiveSessionId(null);
    setMessages([{ ...WELCOME_MESSAGE }]);
    setError("");
  };

  const handleNewSession = async () => {
    try {
      const session = await apiCreateSession();
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([{ ...WELCOME_MESSAGE, id: createMessageId() }]);
      setError("");
    } catch (err) {
      setError("Erro ao criar sessao");
    }
  };

  const handleSelectSession = async (sessionId) => {
    if (busy) return;
    setActiveSessionId(sessionId);
    setError("");
    await loadSessionMessages(sessionId);
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await apiDeleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([{ ...WELCOME_MESSAGE, id: createMessageId() }]);
      }
    } catch {
      setError("Erro ao excluir sessao");
    }
  };

  if (!user) {
    return <Auth onAuthSuccess={onAuthSuccess} />;
  }

  const onStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setBusy(false);
  };

  const onSubmit = async (event, inputRef) => {
    event.preventDefault();
    const cleaned = text.trim();
    if (!cleaned || busy) return;

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
      const result = await sendMessageStream({
        message: cleaned,
        history: chatHistory,
        sessionId: activeSessionId,
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

      // Update sessions list with new/updated session
      if (result && result.sessionId) {
        setActiveSessionId(result.sessionId);
        setSessions((prev) => {
          const exists = prev.find((s) => s.id === result.sessionId);
          if (exists) {
            return prev.map((s) =>
              s.id === result.sessionId
                ? { ...s, title: result.title || s.title }
                : s
            );
          }
          return [{ id: result.sessionId, title: result.title || "Nova conversa" }, ...prev];
        });
      }
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

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
        />
      )}

      <main className="app-main">
        <div className="app-header-auth">
          <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen((p) => !p)}>
            {sidebarOpen ? "\u2630" : "\u2630"}
          </button>
          <div className="brand">ChatLLM Lab</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{user.email}</span>
            <button className="logout-btn" onClick={handleLogout}>Sair</button>
          </div>
        </div>

        <section className="messages" aria-live="polite" ref={messagesRef}>
          <div className="messages-inner">
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

