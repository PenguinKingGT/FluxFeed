import { describe, expect, it } from 'vitest';

import { extractPlainText, extractSummary, sanitizeHtml } from '@/lib/security/sanitize-html';

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

  it.each([
    'javascript:alert(1)',
    ' "javascript:alert(1)" ',
    "'JaVaScRiPt:alert(1)'",
    '"java\tscript:alert(1)"',
    '"java\nscript:alert(1)"',
    '"vbscript:msgbox(1)"',
  ])('removes unsafe link and image URLs after normalization: %j', (url) => {
    const source = document.createElement('template');
    source.innerHTML = '<a>article</a><img alt="cover">';
    source.content.querySelector('a')!.setAttribute('href', url);
    source.content.querySelector('img')!.setAttribute('src', url);

    const result = document.createElement('template');
    result.innerHTML = sanitizeHtml(source.innerHTML);

    expect(result.content.querySelector('a')!.hasAttribute('href')).toBe(false);
    expect(result.content.querySelector('img')!.hasAttribute('src')).toBe(false);
    expect(result.content.querySelector('a')!.textContent).toBe('article');
  });

  it('removes an entity-encoded quoted data link', () => {
    const clean = sanitizeHtml('<a href="&quot;data:text/html,test&quot;">article</a>');
    const result = document.createElement('template');
    result.innerHTML = clean;

    expect(result.content.querySelector('a')!.hasAttribute('href')).toBe(false);
  });

  it.each([
    [' "https://example.com/article?a=1&b=2" ', 'https://example.com/article?a=1&b=2'],
    ["'http://example.com/article'", 'http://example.com/article'],
    ['"/articles/1"', '/articles/1'],
    ['"../article"', '../article'],
    ['"#section"', '#section'],
    ['"mailto:reader@example.com"', 'mailto:reader@example.com'],
  ])('preserves a supported normalized link: %j', (url, expected) => {
    const source = document.createElement('template');
    source.innerHTML = '<a>article</a>';
    source.content.querySelector('a')!.setAttribute('href', url);

    const result = document.createElement('template');
    result.innerHTML = sanitizeHtml(source.innerHTML);
    const link = result.content.querySelector('a')!;

    expect(link.getAttribute('href')).toBe(expected);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('normalizes image URLs while retaining image data and lazy loading', () => {
    const source = document.createElement('template');
    source.innerHTML = '<img><img><img>';
    const images = source.content.querySelectorAll('img');
    images[0].setAttribute('src', "'https://example.com/cover.png'");
    images[1].setAttribute('src', '"/cover.png"');
    images[2].setAttribute('src', '"data:image/png;base64,iVBORw0KGgo="');

    const result = document.createElement('template');
    result.innerHTML = sanitizeHtml(source.innerHTML);
    const cleanImages = result.content.querySelectorAll('img');

    expect(Array.from(cleanImages, (image) => image.getAttribute('src'))).toEqual([
      'https://example.com/cover.png',
      '/cover.png',
      'data:image/png;base64,iVBORw0KGgo=',
    ]);
    expect(Array.from(cleanImages, (image) => image.getAttribute('loading'))).toEqual([
      'lazy',
      'lazy',
      'lazy',
    ]);
  });

  it('removes URL attributes that become empty after normalization', () => {
    const result = document.createElement('template');
    result.innerHTML = sanitizeHtml('<a href="&quot; &quot;">article</a><img src="&quot;&quot;">');

    expect(result.content.querySelector('a')!.hasAttribute('href')).toBe(false);
    expect(result.content.querySelector('img')!.hasAttribute('src')).toBe(false);
  });

  it('preserves safe paragraph boundaries only when explicitly requested', () => {
    const html = '<p>First <strong>paragraph</strong></p><script>unsafe()</script><p>Second<br>line</p>';
    expect(extractPlainText(html, true)).toBe('First paragraph\n\nSecond\nline');
    expect(extractPlainText(html)).not.toContain('\n');
    expect(extractPlainText(html, true)).not.toContain('unsafe');
  });

});
