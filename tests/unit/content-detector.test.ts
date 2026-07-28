import { beforeEach, describe, expect, it } from 'vitest';
import {
  COMMON_FEED_PATHS,
  discoverFeeds,
  guessCommonFeedUrls,
} from '@/lib/content/content-detector';

describe('content detector', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('discovers feeds from alternate link tags first', () => {
    document.head.innerHTML = `
      <link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml">
    `;

    expect(discoverFeeds(document, 'https://example.com/post')).toEqual([
      { url: 'https://example.com/feed.xml', title: 'RSS', type: 'application/rss+xml' },
    ]);
  });

  it('falls back to anchor candidates when no link tag exists', () => {
    document.body.innerHTML = `<a href="/rss.xml">RSS Feed</a>`;

    expect(discoverFeeds(document, 'https://example.com/post')).toEqual([
      { url: 'https://example.com/rss.xml', title: 'RSS Feed' },
    ]);
  });

  it('detects the CitrusReader RSS anchor format', () => {
    document.body.innerHTML = `
      <a
        href="https://blog.cloudflare.com/zh-cn/tag/security/rss"
        target="_blank"
        rel="noopener noreferrer"
        class="feed-info-feed-url font-mono text-xs text-orange-600"
      >
        https://blog.cloudflare.com/zh-cn/tag/security/rss (RSS订阅地址)
      </a>
    `;

    expect(discoverFeeds(document, 'https://www.citrusreader.com/feed?id=example')).toEqual([
      {
        url: 'https://blog.cloudflare.com/zh-cn/tag/security/rss',
        title: 'https://blog.cloudflare.com/zh-cn/tag/security/rss (RSS订阅地址)',
      },
    ]);
  });

  it('generates common feed URL candidates from page origin', () => {
    expect(guessCommonFeedUrls('https://example.com/blog/post')[0]).toBe('https://example.com/feed');
    expect(COMMON_FEED_PATHS).toContain('/atom.xml');
  });
});
