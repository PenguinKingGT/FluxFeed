import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Feed, Settings } from '@/lib/types';
import { SettingsLayout } from '@/components/settings/SettingsLayout';

const settings: Settings = {
  id: 'global',
  refreshInterval: 60,
  maxArticlesPerFeed: 200,
  retentionDays: 90,
  theme: 'system',
  colorTheme: 'quiet-signal',
  language: 'en',
  readingFont: 'system-serif',
  interfaceFont: 'system-sans',
  fontSize: 'medium',
  markReadOnOpen: false,
  showUnreadOnly: false,
  ai: {
    apiUrl: '',
    model: '',
    summaryLanguage: 'auto',
    summaryLength: 'standard',
    customInstructions: '',
    dailyDigestMaxArticles: 100,
    autoSummarizeOnOpen: false,
    autoSummarizeMinCharacters: 1000,
  },
};

const feeds: Feed[] = [{
  id: 'feed-1',
  url: 'https://example.com/feed.xml',
  title: 'Technology',
  description: '',
  siteUrl: 'https://example.com',
  iconUrl: '',
  refreshInterval: 60,
  errorCount: 0,
  createdAt: 1,
}];

vi.mock('@/store', () => ({
  useArticleStore: (selector: any) => selector({ loadArticles: vi.fn() }),
  useSettingsStore: (selector: any) => selector({ settings, updateSettings: vi.fn() }),
  useFeedStore: (selector: any) => selector({ feeds, addFeed: vi.fn(), removeFeed: vi.fn(), loadFeeds: vi.fn() }),
  useGroupStore: (selector: any) => selector({ groups: [], createGroup: vi.fn(), deleteGroup: vi.fn(), moveTreeNode: vi.fn() }),
}));

describe('SettingsLayout', () => {
  afterEach(() => cleanup());

  it('renders template layout and all sections', () => {
    render(
      <MemoryRouter>
        <SettingsLayout />
      </MemoryRouter>,
    );

    expect(screen.getByText('FluxFeed')).not.toBeNull();
    expect(screen.getByAltText('FluxFeed')).not.toBeNull();
    expect(screen.getByText('Feed Reader')).not.toBeNull();
    expect(screen.getByText('Options')).not.toBeNull();
    expect(screen.getByText('Configure your reading experience and manage your data.')).not.toBeNull();
    expect(screen.getByText('Settings').closest('button')?.className).toContain('bg-sidebar-primary');
    expect(screen.getByTestId('settings-container').className).toContain('max-w-6xl');
    expect(screen.getAllByText('General')).toHaveLength(2);
    expect(screen.getAllByText('Appearance')).toHaveLength(2);
    expect(screen.getAllByText('Data Management')).toHaveLength(2);
    expect(screen.getAllByText('Shortcuts')).toHaveLength(2);
    expect(screen.getByText('Refresh Interval')).not.toBeNull();
    expect(screen.getByText('Color Theme')).not.toBeNull();
    expect(screen.getByText('Import OPML')).not.toBeNull();
    expect(screen.getByText('Next / Previous Article')).not.toBeNull();
    expect(screen.queryByText('About')).toBeNull();
  });

  it('scrolls to a section without changing the hash route', () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <SettingsLayout />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(window.location.hash).toBe('');

    Element.prototype.scrollIntoView = originalScrollIntoView;
  });
});
