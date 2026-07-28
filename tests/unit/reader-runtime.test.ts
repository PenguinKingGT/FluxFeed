import { describe, expect, it, vi } from 'vitest';
import { createReaderUrl, openArticleUrl, openSupportPage } from '@/components/reader/reader-runtime';

describe('reader runtime helpers', () => {
  it('creates options hash urls', () => {
    const runtime = { getURL: vi.fn((path: string) => `chrome-extension://id/${path}`) };

    expect(createReaderUrl(runtime, '/inbox')).toBe('chrome-extension://id/options.html#/inbox');
  });

  it('opens article url in an inactive tab', async () => {
    const tabs = { create: vi.fn() };

    await openArticleUrl('https://example.com/post', { tabs });

    expect(tabs.create).toHaveBeenCalledWith({ url: 'https://example.com/post', active: false });
  });

  it('opens the GitHub support page', async () => {
    const tabs = { create: vi.fn() };

    await openSupportPage({ tabs });

    expect(tabs.create).toHaveBeenCalledWith({ url: 'https://github.com/PenguinKingGT/FluxFeed' });
  });
});
