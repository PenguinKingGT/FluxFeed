import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Article, Feed, Group, Settings } from '@/lib/types';
import { ReadingPane } from '@/components/reader/ReadingPane';

const openArticleUrl = vi.fn();

vi.mock('@/components/reader/reader-runtime', () => ({
  openArticleUrl: (url: string) => openArticleUrl(url),
}));

function article(patch: Partial<Article> = {}): Article {
  return {
    id: 'a1',
    feedId: 'f1',
    guid: 'g1',
    title: 'Understanding WXT Framework for Chrome Extensions',
    url: 'https://example.com/post',
    author: 'David Richardson',
    summary: 'Summary',
    content: '<p>Safe text</p><script>alert(1)</script><pre><code>const x = 1</code></pre>',
    publishedAt: Date.UTC(2024, 2, 14),
    isRead: false,
    isStarred: false,
    tags: ['Technology'],
    fetchedAt: Date.UTC(2024, 2, 14),
    ...patch,
  };
}

const feed: Feed = {
  id: 'f1',
  url: 'https://example.com/rss.xml',
  title: 'The Verge',
  description: '',
  siteUrl: 'https://example.com',
  iconUrl: '',
  groupId: 'group-1',
  refreshInterval: 30,
  errorCount: 0,
  createdAt: 1,
};

const group: Group = {
  id: 'group-1',
  name: 'Web',
  order: 1,
  createdAt: 1,
};

const settings = {
  id: 'global',
  refreshInterval: 30,
  maxArticlesPerFeed: 200,
  retentionDays: 90,
  theme: 'light',
  colorTheme: 'quiet-signal',
  language: 'en',
  readingFont: 'system-serif',
  interfaceFont: 'system-sans',
  fontSize: 'medium',
  markReadOnOpen: true,
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
} satisfies Settings;

describe('Reader ReadingPane', () => {
  const markRead = vi.fn();
  const starArticle = vi.fn();
  const goPrev = vi.fn();
  const goNext = vi.fn();
  const onOpenNavigation = vi.fn();
  const onShowArticleList = vi.fn();
  const onToggleFocusMode = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    markRead.mockReset().mockResolvedValue(undefined);
    starArticle.mockReset().mockResolvedValue(undefined);
    goPrev.mockClear();
    goNext.mockClear();
    onOpenNavigation.mockClear();
    onShowArticleList.mockClear();
    onToggleFocusMode.mockClear();
    openArticleUrl.mockClear();
  });

  afterEach(() => cleanup());

  it('renders empty state when no article is selected', () => {
    render(
      <ReadingPane articles={[]} feeds={[]} groups={[]} activeArticleId={null} settings={settings} isFocusMode={false} markRead={markRead} starArticle={starArticle} goPrev={goPrev} goNext={goNext} onOpenNavigation={onOpenNavigation} onShowArticleList={onShowArticleList} onToggleFocusMode={onToggleFocusMode} />,
    );

    expect(screen.getByText('Select an article')).not.toBeNull();
  });

  it('dismisses the AI setup prompt across reader remounts', () => {
    const firstRender = render(
      <ReadingPane articles={[article()]} feeds={[feed]} groups={[group]} activeArticleId="a1" settings={settings} isFocusMode={false} markRead={markRead} starArticle={starArticle} goPrev={goPrev} goNext={goNext} onOpenNavigation={onOpenNavigation} onShowArticleList={onShowArticleList} onToggleFocusMode={onToggleFocusMode} />,
    );

    expect(screen.getByText('Configure an AI service to summarize this article.')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss AI setup prompt' }));
    expect(screen.queryByText('Configure an AI service to summarize this article.')).toBeNull();

    firstRender.unmount();
    render(
      <ReadingPane articles={[article({ id: 'a2' })]} feeds={[feed]} groups={[group]} activeArticleId="a2" settings={settings} isFocusMode={false} markRead={markRead} starArticle={starArticle} goPrev={goPrev} goNext={goNext} onOpenNavigation={onOpenNavigation} onShowArticleList={onShowArticleList} onToggleFocusMode={onToggleFocusMode} />,
    );
    expect(screen.queryByText('Configure an AI service to summarize this article.')).toBeNull();
  });

  it('renders sanitized article and handles actions', async () => {
    render(
      <ReadingPane articles={[article(), article({ id: 'a2', title: 'Next' })]} feeds={[feed]} groups={[group]} activeArticleId="a1" settings={settings} isFocusMode={false} markRead={markRead} starArticle={starArticle} goPrev={goPrev} goNext={goNext} onOpenNavigation={onOpenNavigation} onShowArticleList={onShowArticleList} onToggleFocusMode={onToggleFocusMode} />,
    );

    expect(screen.getByText('Web')).not.toBeNull();
    expect(screen.queryByText('Technology')).toBeNull();
    expect(screen.getByText('March 14, 2024')).not.toBeNull();
    expect(screen.getByText('Understanding WXT Framework for Chrome Extensions')).not.toBeNull();
    expect(screen.getByText('David Richardson')).not.toBeNull();
    expect(screen.getByText(/min read/)).not.toBeNull();
    expect(screen.getByText('Safe text')).not.toBeNull();
    expect(document.body.innerHTML).not.toContain('<script>');
    expect(screen.getByText('const x = 1')).not.toBeNull();
    const articleContent = screen.getByText('Safe text').closest('.reader-prose') as HTMLElement;
    expect(articleContent.className).toContain('dark:prose-invert');
    expect(articleContent.className).not.toContain('prose-lg');
    expect(articleContent.style.fontSize).toBe('17px');
    expect(screen.queryByLabelText('Original Link')).toBeNull();
    expect(screen.getAllByText('Original')).toHaveLength(1);
    await waitFor(() => expect(markRead).toHaveBeenCalledWith('a1'));

    fireEvent.click(screen.getByLabelText('Star article'));
    expect(starArticle).toHaveBeenCalledWith('a1', true);

    fireEvent.click(screen.getByLabelText('Mark as read'));
    expect(markRead).toHaveBeenCalledWith('a1');

    fireEvent.click(screen.getByLabelText('Enter focus mode'));
    expect(onToggleFocusMode).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Back to articles'));
    expect(onShowArticleList).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Original'));
    expect(openArticleUrl).toHaveBeenCalledWith('https://example.com/post');

    expect((screen.getByText('Previous') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Next Article'));
    expect(goNext).toHaveBeenCalled();
  });

  it('does not scroll back to top when auto-mark updates the same article', async () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo;

    const { rerender } = render(
      <ReadingPane articles={[article()]} feeds={[feed]} groups={[group]} activeArticleId="a1" settings={settings} isFocusMode={false} markRead={markRead} starArticle={starArticle} goPrev={goPrev} goNext={goNext} onOpenNavigation={onOpenNavigation} onShowArticleList={onShowArticleList} onToggleFocusMode={onToggleFocusMode} />,
    );

    await waitFor(() => expect(markRead).toHaveBeenCalledWith('a1'));
    expect(scrollTo).toHaveBeenCalledTimes(1);

    rerender(
      <ReadingPane articles={[article({ isRead: true })]} feeds={[feed]} groups={[group]} activeArticleId="a1" settings={settings} isFocusMode={false} markRead={markRead} starArticle={starArticle} goPrev={goPrev} goNext={goNext} onOpenNavigation={onOpenNavigation} onShowArticleList={onShowArticleList} onToggleFocusMode={onToggleFocusMode} />,
    );

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(markRead).toHaveBeenCalledTimes(1);
  });

  it('keeps the responsive title scale independent from the article body size', () => {
    const { rerender } = render(
      <ReadingPane
        articles={[article()]}
        feeds={[feed]}
        groups={[group]}
        activeArticleId="a1"
        settings={{ ...settings, fontSize: 'small' }}
        isFocusMode={false}
        markRead={markRead}
        starArticle={starArticle}
        goPrev={goPrev}
        goNext={goNext}
        onOpenNavigation={onOpenNavigation}
        onShowArticleList={onShowArticleList}
        onToggleFocusMode={onToggleFocusMode}
      />,
    );

    const title = screen.getByRole('heading', { name: article().title });
    const titleClassName = title.className;
    expect(titleClassName).toContain('reader-title');
    expect((screen.getByText('Safe text').closest('.reader-prose') as HTMLElement).style.fontSize).toBe('15px');

    rerender(
      <ReadingPane
        articles={[article()]}
        feeds={[feed]}
        groups={[group]}
        activeArticleId="a1"
        settings={{ ...settings, fontSize: 'large' }}
        isFocusMode={false}
        markRead={markRead}
        starArticle={starArticle}
        goPrev={goPrev}
        goNext={goNext}
        onOpenNavigation={onOpenNavigation}
        onShowArticleList={onShowArticleList}
        onToggleFocusMode={onToggleFocusMode}
      />,
    );

    expect(screen.getByRole('heading', { name: article().title }).className).toBe(titleClassName);
    expect((screen.getByText('Safe text').closest('.reader-prose') as HTMLElement).style.fontSize).toBe('19px');
  });

  it('generates an article summary manually and displays a saved summary', () => {
    const summarizeArticle = vi.fn().mockResolvedValue(undefined);
    const configuredSettings: Settings = {
      ...settings,
      ai: {
        ...settings.ai,
        apiUrl: 'https://ai.example.com/v1/chat/completions',
        model: 'reader-model',
      },
    };
    const currentArticle = article({
      content: `<p>${'Readable article content '.repeat(10)}</p>`,
    });
    const { rerender } = render(
      <ReadingPane articles={[currentArticle]} feeds={[feed]} groups={[group]} activeArticleId="a1" settings={configuredSettings} isFocusMode={false} markRead={markRead} starArticle={starArticle} goPrev={goPrev} goNext={goNext} onOpenNavigation={onOpenNavigation} onShowArticleList={onShowArticleList} onToggleFocusMode={onToggleFocusMode} summarizeArticle={summarizeArticle} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Generate summary' }));
    expect(summarizeArticle).toHaveBeenCalledWith(
      'a1',
      'Readable article content '.repeat(10).trim(),
      { trigger: 'manual' },
    );

    rerender(
      <ReadingPane articles={[article({
        ...currentArticle,
        aiSummary: {
          overview: 'A concise account of the article.',
          keyPoints: ['First point', 'Second point'],
          generatedAt: 1,
          model: 'reader-model',
          sourceFingerprint: 'fingerprint',
          promptVersion: 1,
        },
      })]} feeds={[feed]} groups={[group]} activeArticleId="a1" settings={configuredSettings} isFocusMode={false} markRead={markRead} starArticle={starArticle} goPrev={goPrev} goNext={goNext} onOpenNavigation={onOpenNavigation} onShowArticleList={onShowArticleList} onToggleFocusMode={onToggleFocusMode} summarizeArticle={summarizeArticle} />,
    );

    expect(screen.getByText('A concise account of the article.')).not.toBeNull();
    expect(screen.getByText('First point')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Regenerate' })).not.toBeNull();
  });

  it('automatically summarizes a sufficiently long article once', async () => {
    const summarizeArticle = vi.fn().mockResolvedValue(undefined);
    const configuredSettings: Settings = {
      ...settings,
      ai: {
        ...settings.ai,
        apiUrl: 'https://ai.example.com/v1/chat/completions',
        model: 'reader-model',
        autoSummarizeOnOpen: true,
        autoSummarizeMinCharacters: 100,
      },
    };
    const content = 'Long-form reading content '.repeat(10);

    render(
      <ReadingPane articles={[article({ content: `<p>${content}</p>` })]} feeds={[feed]} groups={[group]} activeArticleId="a1" settings={configuredSettings} isFocusMode={false} markRead={markRead} starArticle={starArticle} goPrev={goPrev} goNext={goNext} onOpenNavigation={onOpenNavigation} onShowArticleList={onShowArticleList} onToggleFocusMode={onToggleFocusMode} summarizeArticle={summarizeArticle} />,
    );

    await waitFor(() => {
      expect(summarizeArticle).toHaveBeenCalledWith(
        'a1',
        content.trim(),
        { trigger: 'auto' },
      );
    });
    expect(summarizeArticle).toHaveBeenCalledTimes(1);
  });
});
