import { useState, useEffect, useRef, useMemo } from 'react';

export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd';
  const w = Math.floor(d / 7);
  if (w < 5) return w + 'w';
  const mo = Math.floor(d / 30);
  if (mo < 12) return mo + 'mo';
  return Math.floor(d / 365) + 'y';
}

export default function Sidebar({
  files,
  activeId,
  onOpen,
  onNew,
  onPin,
  onRename,
  onDelete,
  side,
  density,
}) {
  const [q, setQ] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef(null);

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let arr = files;
    if (needle) {
      arr = files.filter(
        (f) =>
          f.name.toLowerCase().includes(needle) ||
          (f.body || '').toLowerCase().includes(needle)
      );
    }
    return [...arr].sort((a, b) => {
      if (b.pinned !== a.pinned) return b.pinned - a.pinned;
      return b.updatedAt - a.updatedAt;
    });
  }, [files, q]);

  const pinned = filtered.filter((f) => f.pinned);
  const unpinned = filtered.filter((f) => !f.pinned);

  const startRename = (f) => {
    setRenamingId(f.id);
    setRenameValue(f.name);
  };
  const commitRename = () => {
    if (renamingId && renameValue.trim()) onRename(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  const renderRow = (f) => {
    const isActive = f.id === activeId;
    const isRenaming = renamingId === f.id;
    return (
      <div
        key={f.id}
        className={`row ${isActive ? 'active' : ''}`}
        onClick={() => !isRenaming && onOpen(f.id)}
        onDoubleClick={() => startRename(f)}
      >
        <button
          className={`pin ${f.pinned ? 'on' : ''}`}
          onClick={(e) => { e.stopPropagation(); onPin(f.id, !f.pinned); }}
          title={f.pinned ? 'Unpin' : 'Pin'}
        >
          {f.pinned ? '●' : '○'}
        </button>
        <div className="row-main">
          {isRenaming ? (
            <input
              ref={renameRef}
              className="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setRenamingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="row-name">{f.name || 'untitled'}</div>
          )}
          <div className="row-meta">
            <span>{timeAgo(f.updatedAt)}</span>
            <span className="dot-sep">·</span>
            <span>{(f.body || '').length} ch</span>
          </div>
        </div>
        <button
          className="row-del"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${f.name}"?`)) onDelete(f.id);
          }}
          title="Delete"
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <aside className={`sidebar side-${side} density-${density}`}>
      <div className="sidebar-head">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">cloudpad</span>
        </div>
        <button className="new-btn" onClick={onNew} title="New file (⌘N)">
          + new
        </button>
      </div>

      <div className="search-wrap">
        <input
          className="search"
          placeholder="search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="file-list">
        {pinned.length > 0 && (
          <>
            <div className="list-label">pinned</div>
            {pinned.map(renderRow)}
          </>
        )}
        {unpinned.length > 0 && (
          <>
            {pinned.length > 0 && <div className="list-label">all</div>}
            {unpinned.map(renderRow)}
          </>
        )}
        {filtered.length === 0 && (
          <div className="empty-list">{q ? 'no matches' : 'no files yet'}</div>
        )}
      </div>

      <div className="sidebar-foot">
        <span>{files.length} file{files.length === 1 ? '' : 's'}</span>
        <span className="storage-note">indexedDB</span>
      </div>
    </aside>
  );
}
