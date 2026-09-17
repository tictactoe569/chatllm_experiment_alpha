const { useState, useEffect } = React;

function Sidebar({ sessions, activeSessionId, onSelectSession, onNewSession, onDeleteSession }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Sessoes</span>
        <button className="sidebar-new-btn" onClick={onNewSession} title="Nova sessao">
          +
        </button>
      </div>
      <div className="sidebar-list">
        {sessions.length === 0 && (
          <div className="sidebar-empty">Nenhuma sessao ainda</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`sidebar-item ${s.id === activeSessionId ? "active" : ""}`}
            onClick={() => onSelectSession(s.id)}
          >
            <span className="sidebar-item-title">{s.title || "Nova conversa"}</span>
            <button
              className="sidebar-item-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(s.id);
              }}
              title="Excluir sessao"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}