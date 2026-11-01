import { describe, expect, it } from 'vitest';
import { highlightArticleCode } from '@/lib/reader/highlight-code';
import { sanitizeHtml } from '@/lib/security/sanitize-html';

/** Exercises the same sanitizer-to-highlighter boundary used by the article renderer. */
function renderCode(html: string): HTMLDivElement {
  const container = document.createElement('div');
  container.innerHTML = highlightArticleCode(sanitizeHtml(html));
  return container;
}

describe('article code highlighting', () => {
  it('recognizes explicit language hints without retaining source CSS classes', () => {
    const result = renderCode('<pre class="language-css evil"><code>.tooltip { color: red; }</code></pre>');
    expect(result.querySelector('code')?.getAttribute('data-highlighted-language')).toBe('css');
    expect(result.querySelector('.hljs-attribute')?.textContent).toBe('color');
    expect(result.querySelector('.evil')).toBeNull();
  });

  it('detects unlabelled code, including pre blocks without a code element', () => {
    const result = renderCode('<pre>.tooltip { position: relative; color: red; }</pre>');
    expect(result.querySelector('code')?.getAttribute('data-highlighted-language')).toBe('css');
    expect(result.querySelector('.hljs-selector-class')?.textContent).toBe('.tooltip');
  });

  it('preserves whitespace and treats markup in code as text', () => {
    const source = '<script>alert("test")</script>\n  <img src=x onerror=alert(1)>';
    const escaped = source.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const result = renderCode(`<pre><code class="language-html">${escaped}</code></pre>`);
    expect(result.querySelector('pre')?.textContent).toBe(source);
    expect(result.querySelector('script, img')).toBeNull();
    expect(result.querySelectorAll('span').length).toBeGreaterThan(0);
  });

  it('leaves inline code, unsupported languages and explicit plain text unchanged', () => {
    const result = renderCode('<p><code>const x = 1;</code></p><pre><code class="nohighlight">const x = 1;</code></pre><pre><code class="language-unknown">const y = 2;</code></pre>');
    expect(result.querySelector('span')).toBeNull();
  });

  it('limits large blocks and the number of blocks without truncating source', () => {
    const long = 'x'.repeat(20001);
    const result = renderCode(`<pre>${long}</pre>` + '<pre><code class="language-css">a { color: red; }</code></pre>'.repeat(21));
    expect(result.querySelector('pre')?.textContent).toBe(long);
    expect(result.querySelectorAll('code.hljs')).toHaveLength(20);
    expect(result.querySelectorAll('pre')).toHaveLength(22);
  });
});
