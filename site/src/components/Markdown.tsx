import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Lazy-loaded (see Artifact route). Content comes from repo files, so it is always sanitized.
export default function Markdown({ source }: { source: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(source, { async: false }) as string), [source]);
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}
