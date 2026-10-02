const { useState } = React;

function Sidebar({ sessions, activeSessionId, onSelectSession, onCreateSession, onDeleteSession }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? "☰" : "✕"}
      </button>
      {!collapsed && (
        <div className="sidebar-content">
          <div className="sidebar-header">
            <span>Sessoes</span>
            <button className="sidebar-new-btn" onClick={onCreateSession} title="Nova sessao">+</button>
          </div>
          <ul className="sidebar-list">
            {sessions.map((s) => (
              <li
                key={s.id}
                className={`sidebar-item ${s.id === activeSessionId ? "active" : ""}`}
                onClick={() => onSelectSession(s.id)}
              >
                <span className="sidebar-item-title">{s.title}</span>
                <button
                  className="sidebar-delete-btn"
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
                  title="Deletar sessao"
                >🗑</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}