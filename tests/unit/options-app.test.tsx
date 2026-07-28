import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/entrypoints/options/App';

const loadSettings = vi.fn();
const loadFeeds = vi.fn();
const loadGroups = vi.fn();

vi.mock('@/store', () => ({
  useSettingsStore: (selector: any) => selector({ loadSettings }),
  useFeedStore: (selector: any) => selector({ loadFeeds }),
  useGroupStore: (selector: any) => selector({ loadGroups }),
}));

vi.mock('@/components/reader/ReaderLayout', () => ({
  ReaderLayout: ({ view }: { view: string }) => <div data-testid="reader-layout">reader:{view}</div>,
}));

vi.mock('@/components/settings/SettingsLayout', () => ({
  SettingsLayout: () => <div data-testid="settings-layout">settings-layout</div>,
}));

describe('Options App', () => {
  beforeEach(() => {
    loadSettings.mockClear();
    loadFeeds.mockClear();
    loadGroups.mockClear();
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects root to inbox and initializes stores', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText('reader:inbox')).not.toBeNull());
    expect(loadSettings).toHaveBeenCalled();
    expect(loadFeeds).toHaveBeenCalled();
    expect(loadGroups).toHaveBeenCalled();
  });

  it('routes starred, all, folder, feed, and settings', async () => {
    window.location.hash = '#/starred';
    const { rerender } = render(<App />);
    expect(await screen.findByText('reader:starred')).not.toBeNull();

    window.location.hash = '#/all';
    rerender(<App />);
    expect(await screen.findByText('reader:all')).not.toBeNull();

    window.location.hash = '#/folder/Technology';
    rerender(<App />);
    expect(await screen.findByText('reader:folder')).not.toBeNull();

    window.location.hash = '#/feed/feed-1';
    rerender(<App />);
    expect(await screen.findByText('reader:feed')).not.toBeNull();

    window.location.hash = '#/settings';
    rerender(<App />);
    expect(await screen.findByText('settings-layout')).not.toBeNull();
  });
});
