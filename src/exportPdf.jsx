import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import { renderMarkdown } from './markdown.js';

const FONT_FAMILIES = {
  mono: 'Courier',
  serif: 'Times-Roman',
  sans: 'Helvetica',
};

const ACCENT_COLORS = {
  slate: '#475569',
  olive: '#4d7c0f',
  rose: '#be123c',
  amber: '#b45309',
  ink: '#334155',
};

function buildStylesheet({ font, accent }) {
  const fontFamily = FONT_FAMILIES[font] || FONT_FAMILIES.mono;
  const accentColor = ACCENT_COLORS[accent] || ACCENT_COLORS.slate;

  return {
    body: {
      margin: 0,
      color: '#111827',
      fontFamily,
      fontSize: 10.5,
      lineHeight: 1.45,
    },
    p: {
      margin: 0,
      marginBottom: 8,
    },
    h1: {
      marginTop: 0,
      marginBottom: 10,
      fontSize: 18,
      lineHeight: 1.15,
      color: '#0f172a',
    },
    h2: {
      marginTop: 12,
      marginBottom: 8,
      fontSize: 15,
      lineHeight: 1.2,
      color: '#0f172a',
    },
    h3: {
      marginTop: 10,
      marginBottom: 6,
      fontSize: 12.5,
      lineHeight: 1.2,
      color: '#0f172a',
    },
    h4: {
      marginTop: 10,
      marginBottom: 4,
      fontSize: 11.5,
      color: '#334155',
    },
    h5: {
      marginTop: 8,
      marginBottom: 4,
      fontSize: 10.5,
      color: '#475569',
    },
    h6: {
      marginTop: 8,
      marginBottom: 4,
      fontSize: 10,
      color: '#64748b',
    },
    a: {
      color: accentColor,
      textDecoration: 'underline',
    },
    hr: {
      borderBottomWidth: 1,
      borderBottomColor: '#dbe1ea',
      marginTop: 10,
      marginBottom: 10,
    },
    blockquote: {
      marginTop: 0,
      marginBottom: 8,
      paddingLeft: 10,
      borderLeftWidth: 2,
      borderLeftColor: '#cbd5e1',
      color: '#475569',
      fontStyle: 'italic',
    },
    ul: {
      marginTop: 0,
      marginBottom: 8,
      paddingLeft: 14,
    },
    ol: {
      marginTop: 0,
      marginBottom: 8,
      paddingLeft: 14,
    },
    li: {
      marginBottom: 3,
    },
    pre: {
      marginTop: 0,
      marginBottom: 8,
      padding: 8,
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#dbe1ea',
      borderStyle: 'solid',
      fontFamily: FONT_FAMILIES.mono,
      fontSize: 9,
      lineHeight: 1.35,
      color: '#0f172a',
    },
    code: {
      fontFamily: FONT_FAMILIES.mono,
      fontSize: 9.5,
      color: '#0f172a',
    },
    strong: {
      color: '#0f172a',
      fontWeight: 700,
    },
    em: {
      fontStyle: 'italic',
    },
  };
}

function MarkdownPdfDocument({ note, exportedAt, font, accent }) {
  const fontFamily = FONT_FAMILIES[font] || FONT_FAMILIES.mono;
  const html = renderMarkdown(note.body || '');
  const stylesheet = buildStylesheet({ font, accent });
  const displayTitle = note.title || note.name || 'untitled';

  return (
    <Document
      title={displayTitle}
      author="Cloudpad"
      subject="Rendered Markdown export"
      creator="Cloudpad"
      producer="Cloudpad"
      creationDate={exportedAt}
    >
      <Page
        size="A4"
        style={{
          paddingTop: 42,
          paddingRight: 46,
          paddingBottom: 48,
          paddingLeft: 46,
          backgroundColor: '#ffffff',
          color: '#111827',
          fontFamily,
          fontSize: 10.5,
        }}
      >
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 18,
              lineHeight: 1.15,
              color: '#0f172a',
              marginBottom: 4,
            }}
          >
            {displayTitle}
          </Text>
          <Text
            style={{
              fontSize: 8.5,
              color: '#64748b',
            }}
          >
            Exported from Cloudpad on {exportedAt.toLocaleString()}
          </Text>
        </View>

        <Html
          collapse={false}
          resetStyles
          stylesheet={stylesheet}
        >
          {`<html><body>${html || '<p></p>'}</body></html>`}
        </Html>
      </Page>
    </Document>
  );
}

export function getPdfFileName(name) {
  const baseName = (name || 'untitled').replace(/[^\w.-]+/g, '_');
  return baseName.endsWith('.pdf') ? baseName : `${baseName}.pdf`;
}

export async function exportMarkdownPdf(note, options = {}) {
  const safeNote = {
    name: note?.name || 'untitled',
    title: note?.title || note?.name || 'untitled',
    body: note?.body || '',
  };
  const exportedAt = new Date();
  const document = (
    <MarkdownPdfDocument
      note={safeNote}
      exportedAt={exportedAt}
      font={options.font}
      accent={options.accent}
    />
  );

  return pdf(document).toBlob();
}
