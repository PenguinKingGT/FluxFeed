import { describe, expect, it } from 'vitest';

import { parseJsonFeed } from '@/lib/parser/json-feed';

describe('JSON Feed parser', () => {
  it('maps JSON Feed fields to ParsedFeed', () => {
    const feed = parseJsonFeed(JSON.stringify({
      version: 'https://jsonfeed.org/version/1.1',
      title: 'Example JSON',
      description: 'JSON description',
      home_page_url: 'https://example.com',
      icon: 'https://example.com/icon.png',
      items: [{
        id: 'item-1',
        title: 'JSON article',
        url: 'https://example.com/json-a',
        author: { name: 'Grace' },
        date_published: '2024-01-04T00:00:00.000Z',
        summary: 'JSON summary',
        content_html: '<p>JSON content</p>',
      }],
    }));

    expect(feed).toMatchObject({
      title: 'Example JSON',
      description: 'JSON description',
      siteUrl: 'https://example.com',
      iconUrl: 'https://example.com/icon.png',
    });
    expect(feed.articles[0]).toMatchObject({
      guid: 'item-1',
      title: 'JSON article',
      url: 'https://example.com/json-a',
      author: 'Grace',
      content: '<p>JSON content</p>',
      publishedAt: Date.parse('2024-01-04T00:00:00.000Z'),
    });
  });

  it('falls back to url, summary title, and current time', () => {
    const before = Date.now();
    const feed = parseJsonFeed(JSON.stringify({
      title: 'Fallback JSON',
      items: [{
        url: 'https://example.com/fallback',
        date_published: 'bad date',
        summary: 'Fallback summary for JSON item title',
      }],
    }));
    const after = Date.now();

    expect(feed.articles[0]).toMatchObject({
      guid: 'https://example.com/fallback',
      title: 'Fallback summary for JSON item title',
      url: 'https://example.com/fallback',
    });
    expect(feed.articles[0]!.publishedAt).toBeGreaterThanOrEqual(before);
    expect(feed.articles[0]!.publishedAt).toBeLessThanOrEqual(after);
  });

  it('preserves text-only content as escaped HTML with line breaks, ahead of the summary', () => {
    const feed = parseJsonFeed(JSON.stringify({ items: [{
      id: 'text', content_text: '2 < 3 & 4 > 1\n<script>literal</script>\r\nnext', summary: 'Short',
    }] }));
    const container = document.createElement('div');
    container.innerHTML = feed.articles[0].content;
    expect(container.textContent).toBe('2 < 3 & 4 > 1<script>literal</script>next');
    expect(container.querySelectorAll('br')).toHaveLength(2);
    expect(container.querySelector('script')).toBeNull();
    expect(feed.articles[0].title).toBe('2 < 3 & 4 > 1 <script>literal</script> next');
  });

  it('prefers HTML over text and never decodes literal entity notation in plain text', () => {
    const feed = parseJsonFeed(JSON.stringify({ items: [
      { content_html: '<p>HTML &amp; body</p>', content_text: 'Other text' },
      { content_text: '&lt;literal&gt;' },
    ] }));
    expect(feed.articles[0].content).toBe('<p>HTML &amp; body</p>');
    expect(feed.articles[1].content).toBe('&amp;lt;literal&amp;gt;');
  });

});
