import { describe, expect, it, vi } from 'vitest';
import { createDetectedFeedStore } from '@/store/detectedFeedStore';

describe('detected feed store', () => {
  it('loads detected feeds from background response data', async () => {
    const client = {
      send: vi.fn().mockResolvedValue({
        success: true,
        data: { feeds: [{ url: 'https://example.com/rss.xml', title: 'RSS' }] },
      }),
    };
    const store = createDetectedFeedStore(client);

    await store.getState().check();

    expect(client.send).toHaveBeenCalledWith({ type: 'GET_DETECTED_FEEDS' });
    expect(store.getState().detectedFeeds).toEqual([
      { url: 'https://example.com/rss.xml', title: 'RSS' },
    ]);
  });

  it('actively scans the current tab before using background cache', async () => {
    const client = {
      send: vi.fn(),
    };
    const scanCurrentTab = vi.fn().mockResolvedValue([
      { url: 'https://example.com/atom.xml', title: 'Current page Atom' },
    ]);
    const store = createDetectedFeedStore(client, scanCurrentTab);

    await store.getState().check();

    expect(scanCurrentTab).toHaveBeenCalled();
    expect(client.send).not.toHaveBeenCalled();
    expect(store.getState().detectedFeeds).toEqual([
      { url: 'https://example.com/atom.xml', title: 'Current page Atom' },
    ]);
  });

  it('falls back to background cache when the active tab cannot be scanned', async () => {
    const client = {
      send: vi.fn().mockResolvedValue({
        success: true,
        data: { feeds: [{ url: 'https://example.com/rss.xml', title: 'Cached RSS' }] },
      }),
    };
    const store = createDetectedFeedStore(client, vi.fn().mockResolvedValue(null));

    await store.getState().check();

    expect(client.send).toHaveBeenCalledWith({ type: 'GET_DETECTED_FEEDS' });
    expect(store.getState().detectedFeeds).toEqual([
      { url: 'https://example.com/rss.xml', title: 'Cached RSS' },
    ]);
  });
});
