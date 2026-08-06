import { useState, useEffect, useRef, useMemo } from 'react';
import { renderMarkdown } from './markdown.js';
import { timeAgo } from './Sidebar.jsx';

export default function Editor({
  file,
  onChange,
  onTitleChange,
  saveStatus,
  showPreview,
  onTogglePreview,
  width,
  autoCopyEnabled,
}) {
  const [titleVal, setTitleVal] = useState(file?.title || file?.name || '');
  const [copied, setCopied] = useState(false);
  const taRef = useRef(null);
  const lastCopiedRef = useRef('');
  const copyTimerRef = useRef(null);

  useEffect(() => {
    setTitleVal(file?.title || file?.name || '');
  }, [file?.id, file?.title, file?.name]);

  useEffect(() => {
    const el = taRef.current;
    if (!el || !autoCopyEnabled) return;
    lastCopiedRef.current = '';

    const copySelection = () => {
      const { selectionStart, selectionEnd, value } = el;
      if (selectionStart === selectionEnd) {
        lastCopiedRef.current = '';
        return;
      }
      const text = value.slice(selectionStart, selectionEnd);
      if (text === lastCopiedRef.current) return;
      lastCopiedRef.current = text;
      navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 1400);
      }).catch(() => {});
    };

    const events = ['mouseup', 'keyup', 'touchend'];
    events.forEach((event) => el.addEventListener(event, copySelection));
    return () => {
      events.forEach((event) => el.removeEventListener(event, copySelection));
      clearTimeout(copyTimerRef.current);
    };
  }, [autoCopyEnabled, file?.id, showPreview]);

  const counts = useMemo(() => {
    const body = file?.body || '';
    const chars = body.length;
    const words = body.trim() ? body.trim().split(/\s+/).length : 0;
    const lines = body ? body.split('\n').length : 0;
    return { chars, words, lines };
  }, [file?.body]);

  if (!file) {
    return (
      <div className="editor-empty">
        <div className="cursor-only">
          <span className="blinking-cursor">|</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`editor width-${width}`}>
      <div className="editor-titlebar" data-tour="editor-header">
        <input
          className="title-input"
          value={titleVal}
          placeholder="untitled"
          onChange={(e) => setTitleVal(e.target.value)}
          onBlur={() => {
            const v = titleVal.trim() || 'untitled';
            const currentTitle = file.title || file.name || 'untitled';
            if (v !== currentTitle) onTitleChange(v);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
        />
        <div className="editor-tools">
          <span className={`save-status ${saveStatus}`}>
            <span className="save-dot" />
            <span className="save-text">
              {saveStatus === 'saving' ? 'saving' : 'saved'}
            </span>
          </span>
          <span className={`copy-status ${copied ? 'visible' : ''}`}>
            <span className="copy-dot" />
            <span>copied</span>
          </span>
          <button
            className={`tool-btn ${showPreview ? 'on' : ''}`}
            onClick={onTogglePreview}
            title="Markdown preview (⌘P)"
            data-tour="preview-toggle"
          >
            md
          </button>
        </div>
      </div>

      <div className="editor-body" data-tour="editor-body">
        {showPreview ? (
          <div
            className="preview"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(file.body || '') }}
          />
        ) : (
          <textarea
            ref={taRef}
            className="textarea"
            value={file.body || ''}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            autoFocus
          />
        )}
      </div>

      <div className="editor-statusbar">
        <div className="status-left">
          <span>{counts.words} word{counts.words === 1 ? '' : 's'}</span>
          <span className="dot-sep">·</span>
          <span>{counts.chars} char{counts.chars === 1 ? '' : 's'}</span>
          <span className="dot-sep">·</span>
          <span>{counts.lines} line{counts.lines === 1 ? '' : 's'}</span>
        </div>
        <div className="status-right">
          <span>edited {timeAgo(file.updatedAt)} ago</span>
        </div>
      </div>
    </div>
  );
}
