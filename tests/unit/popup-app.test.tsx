import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/entrypoints/popup/App';

const check = vi.fn();
const loadFeeds = vi.fn();
const loadArticles = vi.fn();
const addFeed = vi.fn();
const markAllRead = vi.fn();
const loadSettings = vi.fn();

vi.mock('@/store', () => ({
  useDetectedFeedStore: (selector: any) => selector({ detectedFeeds: [{ url: 'https://example.com/rss.xml', title: 'RSS' }], check }),
  useFeedStore: (selector: any) => selector({ feeds: [], loadFeeds, addFeed }),
  useArticleStore: (selector: any) => selector({ articles: [], loadArticles, markAllRead }),
  useSettingsStore: (selector: any) => selector({ loadSettings }),
}));

vi.mock('@/components/popup/popup-runtime', () => ({
  openArticleInOptions: vi.fn(),
  openSettingsInOptions: vi.fn(),
}));

describe('Popup App', () => {
  beforeEach(() => {
    check.mockClear();
    loadFeeds.mockClear();
    loadArticles.mockClear();
    addFeed.mockReset().mockResolvedValue({ success: true });
    markAllRead.mockClear();
    loadSettings.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads stores on mount and renders popup shell', () => {
    render(<App />);

    expect(screen.getByText('FluxFeed')).not.toBeNull();
    expect(screen.getByAltText('FluxFeed')).not.toBeNull();
    expect(check).toHaveBeenCalled();
    expect(loadFeeds).toHaveBeenCalled();
    expect(loadArticles).toHaveBeenCalledWith({ view: 'inbox', showUnreadOnly: true });
    expect(loadSettings).toHaveBeenCalled();
    expect(addFeed).not.toHaveBeenCalled();
    expect(screen.getByTestId('popup-shell').className).toContain('bg-background');
  });

  it('subscribes detected feed through feed store', async () => {
    render(<App />);

    fireEvent.click(screen.getByText('Subscribe to this page'));

    await waitFor(() => expect(addFeed).toHaveBeenCalledWith('https://example.com/rss.xml'));
    await waitFor(() =>
      expect(loadArticles).toHaveBeenCalledTimes(2),
    );
  });

  it('marks all articles as read from footer', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Mark all as read'));

    expect(markAllRead).toHaveBeenCalled();
  });
});
