import { useState, useEffect, useRef, useCallback } from 'react';
import NotepadDB from './db.js';
import Sidebar from './Sidebar.jsx';
import TabBar from './TabBar.jsx';
import Editor from './Editor.jsx';
import { ShortcutsPanel, TweaksPanel } from './Panels.jsx';

const TWEAK_DEFAULTS = {
  theme: 'light',
  font: 'mono',
  side: 'left',
  density: 'airy',
  tabStyle: 'classic',
  width: 'medium',
  accent: 'slate',
};

export default function App() {
  const [files, setFiles] = useState([]);
  const [openIds, setOpenIds] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const dragCounter = useRef(0);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = (e) => {
      if (!exportMenuRef.current?.contains(e.target)) setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportMenuOpen]);

  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('notepad.settings') || 'null');
      return { ...TWEAK_DEFAULTS, ...(saved || {}) };
    } catch {
      return TWEAK_DEFAULTS;
    }
  });

  useEffect(() => {
    localStorage.setItem('notepad.settings', JSON.stringify(settings));
  }, [settings]);

  // Initial load
  useEffect(() => {
    (async () => {
      const list = await NotepadDB.listSync();
      setFiles(list);
      try {
        const saved = JSON.parse(localStorage.getItem('notepad.tabs') || 'null');
        if (saved?.openIds?.length) {
          const existing = saved.openIds.filter((id) => list.some((f) => f.id === id));
          setOpenIds(existing);
          setActiveId(existing.includes(saved.activeId) ? saved.activeId : existing[0] || null);
        }
      } catch {}
    })();
  }, []);

  // Persist tabs
  useEffect(() => {
    localStorage.setItem('notepad.tabs', JSON.stringify({ openIds, activeId }));
  }, [openIds, activeId]);

  // Apply theme to root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-font', settings.font);
    root.setAttribute('data-accent', settings.accent);
    root.setAttribute('data-density', settings.density);
  }, [settings.theme, settings.font, settings.accent, settings.density]);

  const activeFile = files.find((f) => f.id === activeId) || null;

  const refresh = async () => {
    const list = await NotepadDB.listSync();
    setFiles(list);
  };

  const openFile = (id) => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveId(id);
    setMobileSidebarOpen(false);
  };

  const closeTab = (id) => {
    setOpenIds((prev) => {
      const idx = prev.indexOf(id);
      const next = prev.filter((x) => x !== id);
      if (activeId === id) {
        setActiveId(next[idx] || next[idx - 1] || next[0] || null);
      }
      return next;
    });
  };

  const newFile = async () => {
    const f = await NotepadDB.create({ name: 'untitled', body: '' });
    await refresh();
    setOpenIds((prev) => [...prev, f.id]);
    setActiveId(f.id);
  };

  // Debounced autosave
  const saveTimer = useRef(null);
  const pendingRef = useRef({});
  const scheduleSave = useCallback((id, patch) => {
    setSaveStatus('saving');
    pendingRef.current[id] = { ...(pendingRef.current[id] || {}), ...patch };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const jobs = pendingRef.current;
      pendingRef.current = {};
      for (const fid of Object.keys(jobs)) {
        await NotepadDB.update(fid, jobs[fid]);
      }
      await refresh();
      setSaveStatus('saved');
    }, 400);
  }, []);

  const onBodyChange = (value) => {
    if (!activeFile) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFile.id ? { ...f, body: value, updatedAt: Date.now() } : f))
    );
    scheduleSave(activeFile.id, { body: value });
  };

  const onRenameActive = (name) => {
    if (!activeFile) return;
    setFiles((prev) => prev.map((f) => (f.id === activeFile.id ? { ...f, name } : f)));
    scheduleSave(activeFile.id, { name });
  };

  const renameFile = (id, name) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    scheduleSave(id, { name });
  };

  const pinFile = async (id, pinned) => {
    await NotepadDB.update(id, { pinned: pinned ? 1 : 0 });
    await refresh();
  };

  const deleteFile = async (id) => {
    await NotepadDB.remove(id);
    setOpenIds((prev) => prev.filter((x) => x !== id));
    if (activeId === id) setActiveId(null);
    await refresh();
  };

  const exportActive = useCallback(() => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.body || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = (activeFile.name || 'untitled').replace(/[^\w.-]+/g, '_');
    a.href = url;
    a.download = /\.(md|txt)$/.test(name) ? name : name + '.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [activeFile]);

  const exportWorkspace = useCallback(() => {
    const backup = { cloudpad_backup: true, version: 1, exportedAt: Date.now(), files };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudpad-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [files]);

  const deleteWorkspace = useCallback(async () => {
    await NotepadDB.replaceAll([]);
    setOpenIds([]);
    setActiveId(null);
    await refresh();
  }, []);

  const restoreWorkspace = useCallback(async (data) => {
    if (!data?.cloudpad_backup || !Array.isArray(data.files)) {
      alert('Not a valid Cloudpad workspace backup.');
      return;
    }
    const count = data.files.length;
    if (!confirm(`Restore ${count} file${count === 1 ? '' : 's'} from backup?\nThis will replace your current workspace.`)) return;
    await NotepadDB.replaceAll(data.files);
    setOpenIds([]);
    setActiveId(null);
    await refresh();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); openFilePicker(); }
      else if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); newFile(); }
      else if (mod && e.key.toLowerCase() === 'w') { e.preventDefault(); if (activeId) closeTab(activeId); }
      else if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); document.querySelector('.search')?.focus(); }
      else if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); setShowPreview((p) => !p); }
      else if (mod && e.key === '/') { e.preventDefault(); setShowShortcuts((s) => !s); }
      else if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); setExportMenuOpen((o) => !o); }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' })); }
      else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); } // auto-saving
      else if (e.key === 'Escape') { setShowShortcuts(false); setTweaksOpen(false); setExportMenuOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, exportActive]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current++;
    if ([...e.dataTransfer.items].some((item) => item.kind === 'file')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const importFiles = async (fileList) => {
    const all = [...fileList];
    const jsonFile = all.find((f) => /\.json$/i.test(f.name));
    if (jsonFile) {
      try {
        const data = JSON.parse(await jsonFile.text());
        await restoreWorkspace(data);
      } catch {
        alert('Failed to parse workspace backup.');
      }
      return;
    }
    const valid = all.filter((f) => /\.(md|txt)$/i.test(f.name));
    if (!valid.length) return;
    let lastId = null;
    for (const file of valid) {
      const body = await file.text();
      const name = file.name.replace(/\.(md|txt)$/i, '');
      const created = await NotepadDB.create({ name, body });
      lastId = created.id;
      setOpenIds((prev) => [...prev, created.id]);
    }
    await refresh();
    if (lastId) setActiveId(lastId);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    await importFiles(e.dataTransfer.files);
  };

  const fileInputRef = useRef(null);
  const openFilePicker = () => fileInputRef.current?.click();
  const handleFileInput = (e) => {
    importFiles(e.target.files);
    e.target.value = '';
  };

  const openTabs = openIds
    .map((id) => files.find((f) => f.id === id))
    .filter(Boolean)
    .map((f) => ({ id: f.id, name: f.name, dirty: false }));

  return (
    <div className={`app side-${settings.side}`}>
      {mobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <Sidebar
        files={files}
        activeId={activeId}
        onOpen={openFile}
        onNew={newFile}
        onPin={pinFile}
        onRename={renameFile}
        onDelete={deleteFile}
        side={settings.side}
        density={settings.density}
        mobileOpen={mobileSidebarOpen}
      />

      <main
        className="main"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="drop-overlay">
            <div className="drop-overlay-inner">
              <span className="drop-overlay-icon">↓</span>
              <span>Drop .md · .txt · .json</span>
            </div>
          </div>
        )}
        <TabBar
          tabs={openTabs}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={closeTab}
          onNew={newFile}
          style={settings.tabStyle}
          onMenuToggle={() => setMobileSidebarOpen((o) => !o)}
        />

        <div className="editor-wrap">
          <Editor
            file={activeFile}
            onChange={onBodyChange}
            onRename={onRenameActive}
            saveStatus={saveStatus}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview((p) => !p)}
            width={settings.width}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.json"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
        <div className="bottom-chrome">
          <button className="chrome-btn" onClick={() => setShowShortcuts(true)} title="Shortcuts (⌘/)">⌘/</button>
          <button className="chrome-btn" onClick={openFilePicker} title="Open file (⌘O)">open</button>
          <div className="export-wrap" ref={exportMenuRef}>
            <button
              className={`chrome-btn ${exportMenuOpen ? 'on' : ''}`}
              onClick={() => setExportMenuOpen((o) => !o)}
              title="Export (⌘E)"
            >
              export
            </button>
            {exportMenuOpen && (
              <div className="export-menu">
                <button
                  className="export-menu-item"
                  onClick={() => { exportActive(); setExportMenuOpen(false); }}
                  disabled={!activeFile}
                >
                  current file
                </button>
                <button
                  className="export-menu-item"
                  onClick={() => { exportWorkspace(); setExportMenuOpen(false); }}
                >
                  workspace
                </button>
              </div>
            )}
          </div>
          <button
            className="chrome-btn"
            onClick={() => setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
            title="Toggle dark (⌘D)"
          >
            {settings.theme === 'dark' ? '☀' : '☾'}
          </button>
          <button className={`chrome-btn ${tweaksOpen ? 'on' : ''}`} onClick={() => setTweaksOpen((o) => !o)} title="Tweaks">
            tweaks
          </button>
          <a className="chrome-btn chrome-icon" href="https://github.com" target="_blank" rel="noopener" title="GitHub" aria-label="GitHub">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>
        </div>
      </main>

      <ShortcutsPanel open={showShortcuts} onClose={() => setShowShortcuts(false)} onDeleteWorkspace={deleteWorkspace} />
      <TweaksPanel open={tweaksOpen} settings={settings} setSettings={setSettings} onClose={() => setTweaksOpen(false)} />
    </div>
  );
}
