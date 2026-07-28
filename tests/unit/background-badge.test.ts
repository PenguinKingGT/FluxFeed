import { describe, expect, it, vi } from 'vitest';

import { formatBadgeText, updateBadge } from '@/entrypoints/background/badge';

describe('background badge', () => {
  it('formats unread counts for badge display', () => {
    expect(formatBadgeText(0)).toBe('');
    expect(formatBadgeText(5)).toBe('5');
    expect(formatBadgeText(100)).toBe('99+');
  });

  it('clears badge when there are no unread articles', async () => {
    const chromeApi = {
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
      },
    };
    const storageService = {
      getUnreadCount: async () => 0,
    };

    await updateBadge(chromeApi, storageService);

    expect(chromeApi.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    expect(chromeApi.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
  });

  it('sets badge text and background when there are unread articles', async () => {
    const chromeApi = {
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
      },
    };
    const storageService = {
      getUnreadCount: async () => 42,
    };

    await updateBadge(chromeApi, storageService);

    expect(chromeApi.action.setBadgeText).toHaveBeenCalledWith({ text: '42' });
    expect(chromeApi.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#FEA619' });
  });
});
