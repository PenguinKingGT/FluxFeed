import { describe, expect, it } from 'vitest';

import { extractSummary, sanitizeHtml } from '@/lib/security/sanitize-html';

describe('sanitizeHtml', () => {
  it('removes scripts and dangerous attributes while preserving reading tags', () => {
    const clean = sanitizeHtml(`
      <p>Hello <strong>world</strong></p>
      <script>alert(1)</script>
      <img src="x.jpg" onerror="alert(1)" alt="x">
      <a href="https://example.com" onclick="alert(1)">link</a>
      <a href='"https://example.com/quoted"'>quoted</a>
      <pre><code>const a = 1</code></pre>
    `);

    expect(clean).toContain('<p>');
    expect(clean).toContain('<strong>world</strong>');
    expect(clean).toContain('<pre><code>const a = 1</code></pre>');
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('href="https://example.com/quoted"');
    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="noopener noreferrer"');
    expect(clean).toContain('loading="lazy"');
  });

  it('extracts plain text summary with truncation', () => {
    expect(extractSummary('<p>Hello <strong>world</strong> again</p>', 11)).toBe('Hello world…');
  });
});
