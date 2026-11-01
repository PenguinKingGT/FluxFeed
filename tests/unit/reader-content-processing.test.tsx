import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DOMPurify from 'dompurify';
import { ReadingPane } from '@/components/reader/ReadingPane';
import { DEFAULT_SETTINGS } from '@/lib/db/defaults';
import * as chunker from '@/lib/ai/article-chunker';
import * as highlighting from '@/lib/reader/highlight-code';
import * as formatting from '@/components/reader/reader-format';
import * as preferences from '@/lib/ai/ai-preferences';
import type { Article } from '@/lib/types';

const content = `<p>${'Long article 🙂 text '.repeat(4000)}</p><p>Second paragraph</p>`;
const article: Article = {
  id: 'a1', feedId: 'f1', guid: 'a1', title: 'Long article', url: 'https://example.com',
  author: '', summary: '', content, publishedAt: 1, fetchedAt: 1,
  isRead: true, isStarred: false, tags: [],
};
const props = {
  articles: [article], feeds: [], groups: [], activeArticleId: 'a1',
  settings: {
    ...DEFAULT_SETTINGS,
    ai: { ...DEFAULT_SETTINGS.ai, model: 'reader', apiUrl: 'https://ai.example.com/v1' },
  },
  isFocusMode: false,
  markRead: vi.fn(), starArticle: vi.fn(), goPrev: vi.fn(), goNext: vi.fn(),
  onOpenNavigation: vi.fn(), onShowArticleList: vi.fn(), onToggleFocusMode: vi.fn(),
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('reader content processing', () => {
  it('sanitizes once and skips AI-only processing while the panel is hidden', () => {
    const sanitize = vi.spyOn(DOMPurify, 'sanitize');
    const plan = vi.spyOn(chunker, 'planArticleSummary');
    const count = vi.spyOn(preferences, 'countUnicodeCharacters');
    render(<ReadingPane {...props} settings={{
      ...props.settings, ai: { ...props.settings.ai, showArticleSummary: false },
    }} />);
    expect(sanitize).toHaveBeenCalledTimes(1);
    expect(plan).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
    expect(screen.getByText('Second paragraph')).not.toBeNull();
  });

  it('reuses the text, plan and counts across unrelated updates and invalidates changed HTML', () => {
    const highlight = vi.spyOn(highlighting, 'highlightArticleCode');
    const readTime = vi.spyOn(formatting, 'estimateReadMinutes');
    const sanitize = vi.spyOn(DOMPurify, 'sanitize');
    const plan = vi.spyOn(chunker, 'planArticleSummary');
    const count = vi.spyOn(preferences, 'countUnicodeCharacters');
    const summarizeArticle = vi.fn();
    const { rerender } = render(<ReadingPane {...props} summarizeArticle={summarizeArticle} />);
    expect(sanitize).toHaveBeenCalledTimes(1);
    expect(plan).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledTimes(1);
    rerender(<ReadingPane {...props} articles={[{ ...article, isStarred: true }]}
      summaryStatusByArticleId={{ a1: 'loading' }} summarizeArticle={summarizeArticle} />);
    rerender(<ReadingPane {...props} articles={[{ ...article, isRead: false }]}
      settings={{ ...props.settings, articleStyle: 'vue', fontSize: 'large' }}
      summarizeArticle={summarizeArticle} />);
    expect(sanitize).toHaveBeenCalledTimes(1);
    expect(plan).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledTimes(1);
    expect(highlight).toHaveBeenCalledTimes(1);
    expect(readTime).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Generate summary' }));
    expect(summarizeArticle).toHaveBeenCalledWith('a1', expect.stringContaining('\n\nSecond paragraph'), {
      trigger: 'manual',
    });
    rerender(<ReadingPane {...props} articles={[{ ...article, content: '<p>Changed</p>' }]} />);
    expect(sanitize).toHaveBeenCalledTimes(2);
    expect(plan).toHaveBeenCalledTimes(2);
    expect(count).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Changed')).not.toBeNull();
    expect(highlight).toHaveBeenCalledTimes(2);
    expect(readTime).toHaveBeenCalledTimes(2);
  });

  it('defers AI input when unconfigured and reuses it after hiding and showing the panel', () => {
    const sanitize = vi.spyOn(DOMPurify, 'sanitize');
    const plan = vi.spyOn(chunker, 'planArticleSummary');
    const count = vi.spyOn(preferences, 'countUnicodeCharacters');
    const { rerender } = render(<ReadingPane {...props} settings={DEFAULT_SETTINGS} />);
    expect(plan).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
    rerender(<ReadingPane {...props} />);
    expect(plan).toHaveBeenCalledTimes(1);
    rerender(<ReadingPane {...props} settings={{
      ...props.settings, ai: { ...props.settings.ai, showArticleSummary: false },
    }} />);
    rerender(<ReadingPane {...props} />);
    expect(sanitize).toHaveBeenCalledTimes(1);
    expect(plan).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledTimes(1);
  });

});
