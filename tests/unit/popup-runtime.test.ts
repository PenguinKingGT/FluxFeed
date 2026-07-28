import { describe, expect, it, vi } from 'vitest';
import { createOptionsUrl, openArticleInOptions, openSettingsInOptions } from '@/components/popup/popup-runtime';

describe('popup runtime helpers', () => {
  it('creates extension options URLs with hash path', () => {
    const runtime = { getURL: vi.fn((path: string) => `chrome-extension://id/${path}`) };

    expect(createOptionsUrl(runtime, '/article/a1')).toBe('chrome-extension://id/options.html#/article/a1');
  });

  it('opens article in options tab', async () => {
    const runtime = { getURL: vi.fn((path: string) => `chrome-extension://id/${path}`) };
    const tabs = { create: vi.fn() };

    await openArticleInOptions('article-1', { runtime, tabs });

    expect(tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://id/options.html#/article/article-1',
    });
  });

  it('opens settings in options tab', async () => {
    const runtime = { getURL: vi.fn((path: string) => `chrome-extension://id/${path}`) };
    const tabs = { create: vi.fn() };

    await openSettingsInOptions({ runtime, tabs });

    expect(tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://id/options.html#/',
    });
  });
});
