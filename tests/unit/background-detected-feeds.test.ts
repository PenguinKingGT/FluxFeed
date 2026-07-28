import { describe, expect, it, vi } from 'vitest';
import { handleBackgroundMessage } from '@/entrypoints/background/message-handler';

describe('background detected feeds messages', () => {
  it('stores detected feeds by tab id', async () => {
    const sessionStorage = { set: vi.fn(), get: vi.fn() };

    const response = await handleBackgroundMessage(
      {
        type: 'FEEDS_DETECTED',
        feeds: [{ url: 'https://example.com/feed.xml', title: 'RSS' }],
        pageUrl: 'https://example.com',
        pageTitle: 'Example',
      },
      {
        storageService: {} as never,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
        sessionStorage,
        senderTabId: 12,
        now: () => 1000,
      },
    );

    expect(response).toEqual({ success: true });
    expect(sessionStorage.set).toHaveBeenCalledWith({
      detected_12: {
        feeds: [{ url: 'https://example.com/feed.xml', title: 'RSS' }],
        pageUrl: 'https://example.com',
        pageTitle: 'Example',
        detectedAt: 1000,
      },
    });
  });

  it('returns cached feeds for current tab', async () => {
    const cached = { feeds: [{ url: 'https://example.com/feed.xml', title: 'RSS' }] };
    const sessionStorage = {
      set: vi.fn(),
      get: vi.fn().mockResolvedValue({ detected_12: cached }),
    };

    const response = await handleBackgroundMessage(
      { type: 'GET_DETECTED_FEEDS' },
      {
        storageService: {} as never,
        fetchFeed: vi.fn(),
        updateBadge: vi.fn(),
        refreshSingleFeed: vi.fn(),
        refreshAllFeeds: vi.fn(),
        sessionStorage,
        senderTabId: 12,
      },
    );

    expect(response).toEqual({ success: true, data: cached });
  });
});
