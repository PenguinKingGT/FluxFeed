import { describe, expect, it, vi } from 'vitest';
import { detectCurrentPageFeeds, notifyDetectedFeeds } from '@/entrypoints/content';

describe('content entrypoint', () => {
  it('sends FEEDS_DETECTED message when feeds exist', async () => {
    const runtime = { sendMessage: vi.fn() };

    await notifyDetectedFeeds(runtime, [{ url: 'https://example.com/feed.xml', title: 'RSS' }], {
      pageUrl: 'https://example.com',
      pageTitle: 'Example',
    });

    expect(runtime.sendMessage).toHaveBeenCalledWith({
      type: 'FEEDS_DETECTED',
      feeds: [{ url: 'https://example.com/feed.xml', title: 'RSS' }],
      pageUrl: 'https://example.com',
      pageTitle: 'Example',
    });
  });

  it('does not send a message when no feeds exist', async () => {
    const runtime = { sendMessage: vi.fn() };

    await notifyDetectedFeeds(runtime, [], {
      pageUrl: 'https://example.com',
      pageTitle: 'Example',
    });

    expect(runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('rescans the current page when popup requests feed detection', () => {
    document.head.innerHTML = '<link rel="alternate" type="application/rss+xml" title="Page RSS" href="/rss.xml">';

    expect(detectCurrentPageFeeds(document, 'https://example.com/article')).toEqual({
      feeds: [{
        url: 'https://example.com/rss.xml',
        title: 'Page RSS',
        type: 'application/rss+xml',
      }],
      pageUrl: 'https://example.com/article',
      pageTitle: '',
    });
  });
});
