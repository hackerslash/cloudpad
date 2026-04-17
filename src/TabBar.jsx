export default function TabBar({ tabs, activeId, onSelect, onClose, onNew, style, onMenuToggle }) {
  return (
    <div className={`tabbar tabstyle-${style}`} data-tour="tabbar">
      <button className="menu-toggle" onClick={onMenuToggle} title="Files" aria-label="Toggle file list">≡</button>
      <div className="tabs">
        {tabs.map((t) => {
          const isActive = t.id === activeId;
          return (
            <div
              key={t.id}
              className={`tab ${isActive ? 'active' : ''} ${t.dirty ? 'dirty' : ''}`}
              onClick={() => onSelect(t.id)}
              onAuxClick={(e) => { if (e.button === 1) onClose(t.id); }}
            >
              <span className="tab-marker" />
              <span className="tab-name">{t.name || 'untitled'}</span>
              <button
                className="tab-close"
                onClick={(e) => { e.stopPropagation(); onClose(t.id); }}
                title="Close (⌘W)"
              >
                ×
              </button>
            </div>
          );
        })}
        <button className="tab-new" onClick={onNew} title="New tab (⌘N)">+</button>
      </div>
    </div>
  );
}
