import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { prepareArticleContent } from '@/lib/reader/prepare-article-content';
import { ArticleContent } from '@/components/reader/ArticleContent';
import { DEFAULT_SETTINGS } from '@/lib/db';
import { ARTICLE_STYLES, normalizeArticleStyle } from '@/lib/reader/article-styles';

const html = `<h2>Heading</h2><p>Read <a href="https://example.com">this link</a> and <code>sizes="auto"</code>.</p>
<ul><li>First<ul><li>Nested</li></ul></li></ul><blockquote><p>Quote</p></blockquote>
<pre><code>const size = 128;
  console.log(size);</code></pre>
<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Size</td></tr></tbody></table>
<hr><img src="https://example.com/photo.jpg" onerror="alert(1)"><script>alert(1)</script>`;

describe('article prose styles', () => {
  afterEach(cleanup);

  it.each(ARTICLE_STYLES)('renders safe semantic content with the %s style', (articleStyle) => {
    const { container } = render(<ArticleContent content={prepareArticleContent(html)} settings={{ ...DEFAULT_SETTINGS, articleStyle }} />);
    const prose = container.firstElementChild as HTMLElement;
    expect(prose.dataset.articleStyle).toBe(articleStyle);
    expect(prose.style.fontSize).toBe('17px');
    expect(prose.querySelectorAll('li')).toHaveLength(2);
    expect(prose.querySelector('pre code')?.textContent).toBe('const size = 128;\n  console.log(size);');
    expect(prose.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(prose.querySelector('hr')).not.toBeNull();
    expect(prose.querySelector('script')).toBeNull();
    expect(prose.querySelector('img')?.getAttribute('onerror')).toBeNull();
  });

  it('keeps original styling for legacy preferences and unknown values', () => {
    expect(normalizeArticleStyle(undefined)).toBe('default');
    expect(normalizeArticleStyle('body { color: red }')).toBe('default');
    const { container } = render(<ArticleContent content={prepareArticleContent(html)} settings={{ ...DEFAULT_SETTINGS, articleStyle: undefined }} />);
    expect(container.firstElementChild?.getAttribute('data-article-style')).toBe('default');
    expect(container.firstElementChild?.className).not.toContain('article-styled');
  });

  it('changes presentation without rewriting article HTML', () => {
    const { container, rerender } = render(<ArticleContent content={prepareArticleContent(html)} settings={DEFAULT_SETTINGS} />);
    const originalHtml = container.firstElementChild?.innerHTML;
    rerender(<ArticleContent content={prepareArticleContent(html)} settings={{ ...DEFAULT_SETTINGS, articleStyle: 'vue', fontSize: 'large' }} />);
    expect(container.firstElementChild?.innerHTML).toBe(originalHtml);
    expect((container.firstElementChild as HTMLElement).style.fontSize).toBe('19px');
  });
});
