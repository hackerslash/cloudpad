import { useState, useRef, useEffect } from 'react';

export function ShortcutsPanel({ open, onClose, onDeleteWorkspace, onReplayTour }) {
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (deleteMode) inputRef.current?.focus();
  }, [deleteMode]);

  useEffect(() => {
    if (!open) { setDeleteMode(false); setDeleteInput(''); }
  }, [open]);

  if (!open) return null;

  const handleDelete = () => {
    onDeleteWorkspace();
    onClose();
  };

  const rows = [
    ['⌘ N', 'new file'],
    ['⌘ O', 'open file'],
    ['⌘ W', 'close tab'],
    ['⌘ S', 'save (auto)'],
    ['⌘ K', 'focus search'],
    ['⌘ P', 'toggle markdown preview'],
    ['⌘ /', 'toggle shortcuts'],
    ['⌘ E', 'export menu'],
    ['⌘ D', 'toggle dark mode'],
    ['Esc', 'close overlay'],
  ];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <span className="overlay-title">shortcuts</span>
          <button className="overlay-close" onClick={onClose}>×</button>
        </div>
        <div className="shortcut-list">
          {rows.map(([k, label]) => (
            <div className="shortcut-row" key={k}>
              <kbd>{k}</kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="shortcut-actions">
          <button
            className="shortcut-action-btn"
            onClick={() => {
              onReplayTour();
              onClose();
            }}
          >
            replay tour
          </button>
        </div>

        <div className="delete-zone">
          {!deleteMode ? (
            <button className="delete-workspace-btn" onClick={() => setDeleteMode(true)}>
              delete workspace
            </button>
          ) : (
            <div className="delete-confirm">
              <span className="delete-confirm-label">type DELETE to confirm</span>
              <div className="delete-confirm-row">
                <input
                  ref={inputRef}
                  className="delete-confirm-input"
                  value={deleteInput}
                  placeholder="DELETE"
                  onChange={(e) => setDeleteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteInput === 'DELETE') handleDelete();
                    if (e.key === 'Escape') { setDeleteMode(false); setDeleteInput(''); }
                  }}
                />
                <button
                  className="delete-confirm-btn"
                  onClick={handleDelete}
                  disabled={deleteInput !== 'DELETE'}
                >
                  confirm
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TweaksPanel({ open, settings, setSettings, onClose }) {
  if (!open) return null;
  const set = (k, v) => setSettings({ ...settings, [k]: v });

  const Section = ({ label, children }) => (
    <div className="tweak-section">
      <div className="tweak-label">{label}</div>
      <div className="tweak-options">{children}</div>
    </div>
  );
  const Pill = ({ active, onClick, children, swatch }) => (
    <button className={`tweak-pill ${active ? 'active' : ''}`} onClick={onClick}>
      {swatch && <span className="tweak-swatch" style={{ background: swatch }} />}
      {children}
    </button>
  );

  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <span>tweaks</span>
        <button className="overlay-close" onClick={onClose}>×</button>
      </div>

      <Section label="theme">
        {['light', 'sepia', 'dark'].map((t) => (
          <Pill key={t} active={settings.theme === t} onClick={() => set('theme', t)}>{t}</Pill>
        ))}
      </Section>

      <Section label="typography">
        {[['mono', 'mono'], ['serif', 'serif'], ['sans', 'sans']].map(([k, l]) => (
          <Pill key={k} active={settings.font === k} onClick={() => set('font', k)}>{l}</Pill>
        ))}
      </Section>

      <Section label="sidebar">
        {['left', 'right'].map((s) => (
          <Pill key={s} active={settings.side === s} onClick={() => set('side', s)}>{s}</Pill>
        ))}
      </Section>

      <Section label="density">
        {['airy', 'compact'].map((d) => (
          <Pill key={d} active={settings.density === d} onClick={() => set('density', d)}>{d}</Pill>
        ))}
      </Section>

      <Section label="tab style">
        {['classic', 'chips', 'underline', 'dots'].map((t) => (
          <Pill key={t} active={settings.tabStyle === t} onClick={() => set('tabStyle', t)}>{t}</Pill>
        ))}
      </Section>

      <Section label="editor width">
        {['narrow', 'medium', 'wide', 'full'].map((w) => (
          <Pill key={w} active={settings.width === w} onClick={() => set('width', w)}>{w}</Pill>
        ))}
      </Section>

      <Section label="accent">
        {[
          ['slate', 'oklch(0.55 0.06 250)'],
          ['olive', 'oklch(0.55 0.06 130)'],
          ['rose',  'oklch(0.6 0.06 20)'],
          ['amber', 'oklch(0.65 0.08 70)'],
          ['ink',   'oklch(0.3 0.02 270)'],
        ].map(([k, c]) => (
          <Pill key={k} active={settings.accent === k} onClick={() => set('accent', k)} swatch={c}>{k}</Pill>
        ))}
      </Section>
    </div>
  );
}

export function Dialog({ dialog, onClose }) {
  const okRef = useRef(null);

  useEffect(() => {
    if (dialog.open) okRef.current?.focus();
  }, [dialog.open]);

  useEffect(() => {
    if (!dialog.open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose(false);
      if (e.key === 'Enter') onClose(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dialog.open, onClose]);

  if (!dialog.open) return null;

  return (
    <div className="overlay" onClick={() => onClose(dialog.type === 'alert')}>
      <div className="overlay-card dialog-card" onClick={(e) => e.stopPropagation()}>
        <p className="dialog-message">{dialog.message}</p>
        <div className="dialog-actions">
          {dialog.type === 'confirm' && (
            <button className="dialog-btn dialog-btn-cancel" onClick={() => onClose(false)}>
              cancel
            </button>
          )}
          <button
            ref={okRef}
            className={`dialog-btn dialog-btn-ok${dialog.danger ? ' danger' : ''}`}
            onClick={() => onClose(true)}
          >
            {dialog.type === 'confirm' ? 'confirm' : 'ok'}
          </button>
        </div>
      </div>
    </div>
  );
}
