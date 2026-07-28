import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFeedStore } from '@/store/feedStore';
import { createRuntimeMessageClient } from '@/store/message-client';

describe('feed store', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads feeds from background', async () => {
    const client = {
      send: vi.fn().mockResolvedValue({
        success: true,
        data: { feeds: [{ id: 'feed-1', url: 'https://example.com/rss.xml', title: 'RSS' }] },
      }),
    };
    const store = createFeedStore(client);

    await store.getState().loadFeeds();

    expect(client.send).toHaveBeenCalledWith({ action: 'FEED_LIST' });
    expect(store.getState().feeds).toEqual([
      { id: 'feed-1', url: 'https://example.com/rss.xml', title: 'RSS' },
    ]);
    expect(store.getState().isLoading).toBe(false);
  });

  it('adds a feed and reloads feeds after success', async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true, data: { feeds: [] } }),
    };
    const store = createFeedStore(client);

    const response = await store.getState().addFeed('https://example.com/rss.xml', 'group-1');

    expect(response).toEqual({ success: true });
    expect(client.send).toHaveBeenNthCalledWith(1, {
      type: 'ADD_FEED',
      url: 'https://example.com/rss.xml',
      groupId: 'group-1',
    });
    expect(client.send).toHaveBeenNthCalledWith(2, { action: 'FEED_LIST' });
  });

  it('removes a feed and returns the background response', async () => {
    const client = {
      send: vi.fn().mockResolvedValue({ success: true }),
    };
    const store = createFeedStore(client);
    store.setState({
      feeds: [{ id: 'feed-1', url: 'https://example.com/rss.xml', title: 'RSS' }] as never,
    });

    const response = await store.getState().removeFeed('feed-1');

    expect(response).toEqual({ success: true });
    expect(client.send).toHaveBeenCalledWith({ type: 'REMOVE_FEED', feedId: 'feed-1' });
    expect(store.getState().feeds).toEqual([]);
  });

  it('leaves loading state and exposes the error when the runtime rejects', async () => {
    const client = createRuntimeMessageClient({
      sendMessage: vi.fn().mockRejectedValue(new Error('Extension context invalidated')),
    });
    const store = createFeedStore(client);

    await store.getState().loadFeeds();

    expect(store.getState()).toMatchObject({
      feeds: [],
      isLoading: false,
      error: 'Extension context invalidated',
    });
  });
});
