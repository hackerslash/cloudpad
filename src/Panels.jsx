export function ShortcutsPanel({ open, onClose }) {
  if (!open) return null;
  const rows = [
    ['⌘ N', 'new file'],
    ['⌘ W', 'close tab'],
    ['⌘ S', 'save (auto)'],
    ['⌘ K', 'focus search'],
    ['⌘ P', 'toggle markdown preview'],
    ['⌘ /', 'toggle shortcuts'],
    ['⌘ E', 'export current file'],
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
