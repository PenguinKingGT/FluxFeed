import { describe, expect, it, vi } from 'vitest';
import { scanCurrentTabForFeeds } from '@/lib/content/active-tab-feed-detector';

describe('active tab feed detector', () => {
  it('asks the active tab content script to rescan feeds', async () => {
    const runtime = {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage: vi.fn().mockResolvedValue({
          feeds: [{ url: 'https://example.com/rss.xml', title: 'RSS' }],
        }),
      },
    };

    await expect(scanCurrentTabForFeeds(runtime)).resolves.toEqual([
      { url: 'https://example.com/rss.xml', title: 'RSS' },
    ]);
    expect(runtime.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(runtime.tabs.sendMessage).toHaveBeenCalledWith(42, { type: 'DETECT_FEEDS_NOW' });
  });

  it('returns null when the page cannot run the content script', async () => {
    const runtime = {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage: vi.fn().mockRejectedValue(new Error('No receiver')),
      },
      scripting: {
        executeScript: vi.fn().mockRejectedValue(new Error('Cannot inject')),
      },
    };

    await expect(scanCurrentTabForFeeds(runtime)).resolves.toBeNull();
  });

  it('injects a one-off DOM scan when the content script is not available', async () => {
    const runtime = {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage: vi.fn().mockResolvedValue(undefined),
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue([{
          result: {
            feeds: [{
              url: 'https://blog.cloudflare.com/zh-cn/tag/security/rss',
              title: 'Cloudflare Security RSS',
            }],
          },
        }]),
      },
    };

    await expect(scanCurrentTabForFeeds(runtime)).resolves.toEqual([
      {
        url: 'https://blog.cloudflare.com/zh-cn/tag/security/rss',
        title: 'Cloudflare Security RSS',
      },
    ]);
    expect(runtime.tabs.sendMessage).toHaveBeenCalledWith(42, { type: 'DETECT_FEEDS_NOW' });
    expect(runtime.scripting.executeScript).toHaveBeenCalledWith(expect.objectContaining({
      target: { tabId: 42 },
    }));
  });
});
