import { useState, useEffect, useRef, useCallback } from 'react';
import NotepadDB from './db.js';
import Sidebar from './Sidebar.jsx';
import TabBar from './TabBar.jsx';
import Editor from './Editor.jsx';
import GuidedTour from './GuidedTour.jsx';
import { ShortcutsPanel, TweaksPanel, Dialog } from './Panels.jsx';

const MOBILE_BREAKPOINT = 640;
const TOUR_STORAGE_KEY = 'cloudpad.tour.v1.completed';

const TWEAK_DEFAULTS = {
  theme: 'light',
  font: 'mono',
  side: 'left',
  density: 'airy',
  tabStyle: 'classic',
  width: 'medium',
  accent: 'slate',
};

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Cloudpad',
    body: 'Everything here stays local and the tour is short. You can skip at any time.',
  },
  {
    id: 'sidebar-new',
    target: 'sidebar-new',
    title: 'Start with a note',
    body: 'Create a note here. In the list, you can pin items, rename them with a double-click, or delete what you no longer need.',
  },
  {
    id: 'sidebar-search',
    target: 'sidebar-search',
    title: 'Search and scan',
    body: 'Search looks through titles and note text. The list stays ordered by pinned notes first, then the most recently edited.',
  },
  {
    id: 'tabbar',
    target: 'tabbar',
    title: 'Keep a few notes open',
    body: 'Tabs let you move between open notes quickly. Add another note here or close one when you are done.',
  },
  {
    id: 'editor-header',
    target: 'editor-header',
    title: 'Rename and trust autosave',
    body: 'Edit the title here. Cloudpad saves in the background, and the status indicator tells you when changes are settled.',
    requiresFile: true,
  },
  {
    id: 'editor-body',
    target: 'editor-body',
    title: 'Write in the editor',
    body: 'This is the main writing area for plain text or markdown. Stats update at the bottom as you work.',
    requiresFile: true,
  },
  {
    id: 'preview-toggle',
    target: 'preview-toggle',
    title: 'Preview markdown',
    body: 'Switch between writing and rendered markdown whenever you want a quick read on structure and formatting.',
    requiresFile: true,
  },
  {
    id: 'bottom-chrome',
    target: 'bottom-chrome',
    title: 'Use the quick controls',
    body: 'Open files, export notes or the full workspace, toggle the theme, revisit shortcuts, or adjust the app with tweaks.',
  },
  {
    id: 'finish',
    title: 'You are set',
    body: 'That covers the basics. Start writing, or replay the tour later from the shortcuts panel.',
  },
];

function hasTourCompleted() {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markTourCompleted() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  } catch {}
}

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth > MOBILE_BREAKPOINT);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourSteps, setTourSteps] = useState([]);
  const dragCounter = useRef(0);
  const autoTourStartedRef = useRef(false);
  const exportMenuRef = useRef(null);
  const dialogResolveRef = useRef(null);
  const fileInputRef = useRef(null);
  const [dialog, setDialog] = useState({ open: false, type: 'alert', message: '', danger: false });

  const showAlert = useCallback((message) => new Promise((resolve) => {
    dialogResolveRef.current = resolve;
    setDialog({ open: true, type: 'alert', message, danger: false });
  }), []);

  const showConfirm = useCallback((message, { danger = false } = {}) => new Promise((resolve) => {
    dialogResolveRef.current = resolve;
    setDialog({ open: true, type: 'confirm', message, danger });
  }), []);

  const closeDialog = useCallback((result) => {
    dialogResolveRef.current?.(result);
    dialogResolveRef.current = null;
    setDialog((current) => ({ ...current, open: false }));
  }, []);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = (event) => {
      if (!exportMenuRef.current?.contains(event.target)) setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportMenuOpen]);

  useEffect(() => {
    const syncViewport = () => setIsDesktop(window.innerWidth > MOBILE_BREAKPOINT);
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

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

  const refresh = useCallback(async () => {
    const list = await NotepadDB.listSync();
    setFiles(list);
    return list;
  }, []);

  const openFile = useCallback((id) => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveId(id);
    setMobileSidebarOpen(false);
  }, []);

  const createFile = useCallback(async () => {
    const file = await NotepadDB.create({ name: 'untitled', body: '' });
    await refresh();
    setOpenIds((prev) => (prev.includes(file.id) ? prev : [...prev, file.id]));
    setActiveId(file.id);
    return file;
  }, [refresh]);

  const buildTourSteps = useCallback((allowEditorSteps) => (
    TOUR_STEPS.filter((step) => allowEditorSteps || !step.requiresFile)
  ), []);

  const startTour = useCallback((allowEditorSteps) => {
    setShowShortcuts(false);
    setTweaksOpen(false);
    setExportMenuOpen(false);
    setTourSteps(buildTourSteps(allowEditorSteps));
    setTourOpen(true);
  }, [buildTourSteps]);

  const completeTour = useCallback(() => {
    markTourCompleted();
    setTourOpen(false);
    setTourSteps([]);
  }, []);

  const startManualTour = useCallback(() => {
    startTour(Boolean(activeId));
  }, [activeId, startTour]);

  // Initial load
  useEffect(() => {
    (async () => {
      const list = await NotepadDB.listSync();
      setFiles(list);
      try {
        const saved = JSON.parse(localStorage.getItem('notepad.tabs') || 'null');
        if (saved?.openIds?.length) {
          const existing = saved.openIds.filter((id) => list.some((file) => file.id === id));
          setOpenIds(existing);
          setActiveId(existing.includes(saved.activeId) ? saved.activeId : existing[0] || null);
        }
      } catch {}
      setIsLoaded(true);
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

  const activeFile = files.find((file) => file.id === activeId) || null;

  useEffect(() => {
    if (!isLoaded || !isDesktop || autoTourStartedRef.current || hasTourCompleted()) return;

    autoTourStartedRef.current = true;

    (async () => {
      let hasEditorSteps = false;

      if (!files.length) {
        await createFile();
        hasEditorSteps = true;
      } else if (activeId) {
        hasEditorSteps = true;
      } else {
        openFile(files[0].id);
        hasEditorSteps = true;
      }

      startTour(hasEditorSteps);
    })();
  }, [activeId, createFile, files, isDesktop, isLoaded, openFile, startTour]);

  const closeTab = (id) => {
    setOpenIds((prev) => {
      const index = prev.indexOf(id);
      const next = prev.filter((value) => value !== id);
      if (activeId === id) {
        setActiveId(next[index] || next[index - 1] || next[0] || null);
      }
      return next;
    });
  };

  // Heartbeat BPM tracking
  const keystrokeTs = useRef([]);
  const beatRecovery = useRef(null);
  const updateBeat = useCallback(() => {
    const now = Date.now();
    keystrokeTs.current.push(now);
    keystrokeTs.current = keystrokeTs.current.filter((time) => now - time < 3000);
    const kps = keystrokeTs.current.length / 3;
    const bpm = Math.min(160, 30 + kps * 11);
    document.documentElement.style.setProperty('--beat-duration', `${(60 / bpm).toFixed(3)}s`);
    clearTimeout(beatRecovery.current);
    beatRecovery.current = setTimeout(() => {
      document.documentElement.style.setProperty('--beat-duration', '2s');
      keystrokeTs.current = [];
    }, 2500);
  }, []);

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
      for (const fileId of Object.keys(jobs)) {
        await NotepadDB.update(fileId, jobs[fileId]);
      }
      await refresh();
      setSaveStatus('saved');
    }, 400);
  }, [refresh]);

  const onBodyChange = (value) => {
    if (!activeFile) return;
    updateBeat();
    setFiles((prev) =>
      prev.map((file) => (file.id === activeFile.id ? { ...file, body: value, updatedAt: Date.now() } : file))
    );
    scheduleSave(activeFile.id, { body: value });
  };

  const onRenameActive = (name) => {
    if (!activeFile) return;
    setFiles((prev) => prev.map((file) => (file.id === activeFile.id ? { ...file, name } : file)));
    scheduleSave(activeFile.id, { name });
  };

  const renameFile = (id, name) => {
    setFiles((prev) => prev.map((file) => (file.id === id ? { ...file, name } : file)));
    scheduleSave(id, { name });
  };

  const pinFile = async (id, pinned) => {
    await NotepadDB.update(id, { pinned: pinned ? 1 : 0 });
    await refresh();
  };

  const deleteFile = async (id) => {
    await NotepadDB.remove(id);
    setOpenIds((prev) => prev.filter((value) => value !== id));
    if (activeId === id) setActiveId(null);
    await refresh();
  };

  const exportActive = useCallback(() => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.body || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const name = (activeFile.name || 'untitled').replace(/[^\w.-]+/g, '_');
    anchor.href = url;
    anchor.download = /\.(md|txt)$/.test(name) ? name : `${name}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [activeFile]);

  const exportWorkspace = useCallback(() => {
    const backup = { cloudpad_backup: true, version: 1, exportedAt: Date.now(), files };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cloudpad-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [files]);

  const deleteWorkspace = useCallback(async () => {
    await NotepadDB.replaceAll([]);
    setOpenIds([]);
    setActiveId(null);
    await refresh();
  }, [refresh]);

  const restoreWorkspace = useCallback(async (data) => {
    if (!data?.cloudpad_backup || !Array.isArray(data.files)) {
      await showAlert('Not a valid Cloudpad workspace backup.');
      return;
    }
    const count = data.files.length;
    const ok = await showConfirm(
      `Restore ${count} file${count === 1 ? '' : 's'} from backup?\nThis will replace your current workspace.`
    );
    if (!ok) return;
    await NotepadDB.replaceAll(data.files);
    setOpenIds([]);
    setActiveId(null);
    await refresh();
  }, [refresh, showAlert, showConfirm]);

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'o') { event.preventDefault(); openFilePicker(); }
      else if (mod && event.key.toLowerCase() === 'n') { event.preventDefault(); createFile(); }
      else if (mod && event.key.toLowerCase() === 'w') { event.preventDefault(); if (activeId) closeTab(activeId); }
      else if (mod && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('.search')?.focus(); }
      else if (mod && event.key.toLowerCase() === 'p') { event.preventDefault(); setShowPreview((current) => !current); }
      else if (mod && event.key === '/') { event.preventDefault(); setShowShortcuts((current) => !current); }
      else if (mod && event.key.toLowerCase() === 'e') { event.preventDefault(); setExportMenuOpen((current) => !current); }
      else if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setSettings((current) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }));
      } else if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
      } else if (event.key === 'Escape') {
        setShowShortcuts(false);
        setTweaksOpen(false);
        setExportMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, createFile, openFilePicker]);

  const handleDragEnter = (event) => {
    event.preventDefault();
    dragCounter.current += 1;
    if ([...event.dataTransfer.items].some((item) => item.kind === 'file')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const importFiles = async (fileList) => {
    const all = [...fileList];
    const jsonFile = all.find((file) => /\.json$/i.test(file.name));
    if (jsonFile) {
      try {
        const data = JSON.parse(await jsonFile.text());
        await restoreWorkspace(data);
      } catch {
        await showAlert('Failed to parse workspace backup.');
      }
      return;
    }

    const valid = all.filter((file) => /\.(md|txt)$/i.test(file.name));
    if (!valid.length) return;

    let lastId = null;
    for (const file of valid) {
      const body = await file.text();
      const name = file.name.replace(/\.(md|txt)$/i, '');
      const created = await NotepadDB.create({ name, body });
      lastId = created.id;
      setOpenIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
    }
    await refresh();
    if (lastId) setActiveId(lastId);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    await importFiles(event.dataTransfer.files);
  };

  const handleFileInput = (event) => {
    importFiles(event.target.files);
    event.target.value = '';
  };

  const openTabs = openIds
    .map((id) => files.find((file) => file.id === id))
    .filter(Boolean)
    .map((file) => ({ id: file.id, name: file.name, dirty: false }));

  return (
    <div className={`app side-${settings.side}`}>
      {mobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <Sidebar
        files={files}
        activeId={activeId}
        onOpen={openFile}
        onNew={createFile}
        onPin={pinFile}
        onRename={renameFile}
        onDelete={deleteFile}
        onConfirm={showConfirm}
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
          onNew={createFile}
          style={settings.tabStyle}
          onMenuToggle={() => setMobileSidebarOpen((current) => !current)}
        />

        <div className="editor-wrap">
          <Editor
            file={activeFile}
            onChange={onBodyChange}
            onRename={onRenameActive}
            saveStatus={saveStatus}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview((current) => !current)}
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
        <div className="bottom-chrome" data-tour="bottom-chrome">
          <button className="chrome-btn" onClick={() => setShowShortcuts(true)} title="Shortcuts (⌘/)">⌘/</button>
          <button className="chrome-btn" onClick={openFilePicker} title="Open file (⌘O)">open</button>
          <div className="export-wrap" ref={exportMenuRef}>
            <button
              className={`chrome-btn ${exportMenuOpen ? 'on' : ''}`}
              onClick={() => setExportMenuOpen((current) => !current)}
              title="Export (⌘E)"
            >
              export
            </button>
            {exportMenuOpen && (
              <div className="export-menu">
                <button
                  className="export-menu-item"
                  onClick={() => {
                    exportActive();
                    setExportMenuOpen(false);
                  }}
                  disabled={!activeFile}
                >
                  current file
                </button>
                <button
                  className="export-menu-item"
                  onClick={() => {
                    exportWorkspace();
                    setExportMenuOpen(false);
                  }}
                >
                  workspace
                </button>
              </div>
            )}
          </div>
          <button
            className="chrome-btn"
            onClick={() => setSettings((current) => ({
              ...current,
              theme: current.theme === 'dark' ? 'light' : 'dark',
            }))}
            title="Toggle dark (⌘D)"
          >
            {settings.theme === 'dark' ? '☀' : '☾'}
          </button>
          <button className={`chrome-btn ${tweaksOpen ? 'on' : ''}`} onClick={() => setTweaksOpen((current) => !current)} title="Tweaks">
            tweaks
          </button>
          <a className="chrome-btn chrome-icon" href="https://github.com/hackerslash/cloudpad" target="_blank" rel="noopener" title="GitHub" aria-label="GitHub">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
      </main>

      <ShortcutsPanel
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        onDeleteWorkspace={deleteWorkspace}
        onReplayTour={startManualTour}
      />
      <Dialog dialog={dialog} onClose={closeDialog} />
      <TweaksPanel open={tweaksOpen} settings={settings} setSettings={setSettings} onClose={() => setTweaksOpen(false)} />
      <GuidedTour open={tourOpen && isDesktop} steps={tourSteps} onComplete={completeTour} />
    </div>
  );
}
