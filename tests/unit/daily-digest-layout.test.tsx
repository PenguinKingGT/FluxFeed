import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DailyDigestLayout } from '@/components/digest/DailyDigestLayout';
import type { Article, DailyDigest, Settings } from '@/lib/types';

const mocks = vi.hoisted(() => ({
  generateTodayDigest: vi.fn(),
  prepareTodayDigest: vi.fn(),
  setScope: vi.fn(),
}));

vi.mock('@/components/reader/Sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar" />,
}));

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
    apiUrl: 'https://ai.example.com/v1/chat/completions',
    model: 'reader-model',
    summaryLanguage: 'auto',
    summaryLength: 'standard',
    customInstructions: '',
    dailyDigestMaxArticles: 100,
    autoSummarizeOnOpen: false,
    autoSummarizeMinCharacters: 1000,
  },
};

const article: Article = {
  id: 'a1',
  feedId: 'f1',
  guid: 'g1',
  title: 'A useful story',
  url: 'https://example.com/article',
  author: 'Writer',
  summary: '',
  content: '<p>Body</p>',
  publishedAt: Date.UTC(2026, 6, 28, 8),
  isRead: false,
  isStarred: false,
  tags: [],
  fetchedAt: Date.UTC(2026, 6, 28, 8),
};

const digest: DailyDigest = {
  id: '2026-07-28',
  dayKey: '2026-07-28',
  timeZone: 'Asia/Shanghai',
  scope: 'all',
  articleIds: ['a1'],
  overview: 'Today brought one important product update.',
  topics: [{ name: 'Products', overview: 'One product update.', articleIds: ['a1'] }],
  entries: [{
    articleId: 'a1',
    title: article.title,
    source: 'Example Feed',
    publishedAt: article.publishedAt,
    brief: 'A short account of the change.',
    whyItMatters: 'It affects daily readers.',
    topics: ['Products'],
  }],
  generatedAt: Date.now(),
  model: 'reader-model',
  sourceFingerprint: 'fingerprint',
  promptVersion: 1,
};

vi.mock('@/store', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => selector({ settings }),
  useArticleStore: (selector: (state: unknown) => unknown) => selector({
    unreadCount: 1,
    loadUnreadCount: vi.fn(),
  }),
  useFeedStore: (selector: (state: unknown) => unknown) => selector({
    feeds: [],
    addFeed: vi.fn(),
    removeFeed: vi.fn(),
    loadFeeds: vi.fn(),
  }),
  useGroupStore: (selector: (state: unknown) => unknown) => selector({
    groups: [],
    loadGroups: vi.fn(),
    createGroup: vi.fn(),
    deleteGroup: vi.fn(),
    moveTreeNode: vi.fn(),
  }),
  useDailyDigestStore: (selector: (state: unknown) => unknown) => selector({
    digest,
    articles: [article],
    scope: 'all',
    stats: { totalArticles: 1, processedArticles: 1, chunkCount: 1, estimatedRequests: 2 },
    isLoading: false,
    isGenerating: false,
    error: null,
    hasNewContent: false,
    setScope: mocks.setScope,
    prepareTodayDigest: mocks.prepareTodayDigest,
    generateTodayDigest: mocks.generateTodayDigest,
  }),
}));

describe('DailyDigestLayout', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the generated digest and opens a selected story', () => {
    render(
      <MemoryRouter initialEntries={['/digest']}>
        <Routes>
          <Route path="/digest" element={<DailyDigestLayout />} />
          <Route path="/article/:articleId" element={<p>Article destination</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Today’s Briefing' })).not.toBeNull();
    expect(screen.getByText('Today brought one important product update.')).not.toBeNull();
    expect(screen.getByText('A short account of the change.')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /A useful story/ }));
    expect(screen.getByText('Article destination')).not.toBeNull();
  });

  it('allows regenerating a cached digest', () => {
    render(
      <MemoryRouter initialEntries={['/digest']}>
        <Routes>
          <Route path="/digest" element={<DailyDigestLayout />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update briefing' }));
    expect(mocks.generateTodayDigest).toHaveBeenCalledWith(100, true);
  });
});
