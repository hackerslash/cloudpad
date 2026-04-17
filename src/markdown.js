// Tiny, safe-ish markdown renderer. Not full CommonMark — just the basics.
export function renderMarkdown(src) {
  if (!src) return '';
  const esc = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Pull out fenced code blocks first
  const codeBlocks = [];
  src = src.replace(/```([\s\S]*?)```/g, (_, code) => {
    const i = codeBlocks.push(code) - 1;
    return `\u0000CODE${i}\u0000`;
  });

  // Escape everything else
  src = esc(src);

  // Headings
  src = src.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
  src = src.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
  src = src.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
  src = src.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  src = src.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  src = src.replace(/^# (.*)$/gm, '<h1>$1</h1>');

  // Horizontal rule
  src = src.replace(/^---$/gm, '<hr/>');

  // Blockquote
  src = src.replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>');

  // Lists (very simple)
  src = src.replace(/(?:^- .*(?:\n|$))+/gm, (block) => {
    const items = block
      .trim()
      .split('\n')
      .map((l) => `<li>${l.replace(/^- /, '')}</li>`)
      .join('');
    return `<ul>${items}</ul>`;
  });
  src = src.replace(/(?:^\d+\. .*(?:\n|$))+/gm, (block) => {
    const items = block
      .trim()
      .split('\n')
      .map((l) => `<li>${l.replace(/^\d+\. /, '')}</li>`)
      .join('');
    return `<ol>${items}</ol>`;
  });

  // Inline code
  src = src.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold / italic
  src = src.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  src = src.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  src = src.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Links
  src = src.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // Paragraphs (split on double newline)
  src = src
    .split(/\n{2,}/)
    .map((block) => {
      if (/^\s*<(h\d|ul|ol|hr|blockquote|pre)/.test(block.trim())) return block;
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  // Restore code blocks
  src = src.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => {
    return `<pre><code>${esc(codeBlocks[+i].replace(/^\n/, ''))}</code></pre>`;
  });

  return src;
}
