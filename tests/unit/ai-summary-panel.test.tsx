import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareArticleSummaryInput } from '@/lib/reader/prepare-article-content';
import { AiSummaryPanel } from '@/components/reader/AiSummaryPanel';
import { useAutoSummary } from '@/components/reader/use-auto-summary';
import { ARTICLE_MAX_CHARACTERS } from '@/lib/ai/article-chunker';
import { DEFAULT_SETTINGS } from '@/lib/db';
import '@/lib/i18n';
import type { Article } from '@/lib/types';

const settings = {
  ...DEFAULT_SETTINGS,
  ai: {
    ...DEFAULT_SETTINGS.ai,
    apiUrl: 'https://example.com/v1',
    model: 'reader-model',
    autoSummarizeOnOpen: true,
  },
};

const article: Article = {
  id: 'a1',
  feedId: 'f1',
  guid: 'a1',
  title: 'Article',
  url: 'https://example.com/article',
  author: '',
  summary: '',
  content: '',
  publishedAt: 1,
  fetchedAt: 1,
  isRead: false,
  isStarred: false,
  tags: [],
};

const longText = 'A'.repeat(ARTICLE_MAX_CHARACTERS + 100);

/** Exercises automatic eligibility without coupling it to reader layout. */
function AutoSummaryProbe({ text, summarize }: {
  text: string;
  summarize: (articleId: string, contentText: string, options: { trigger: 'auto' }) => Promise<void>;
}) {
  useAutoSummary({
    article,
    input: prepareArticleSummaryInput(text),
    settings,
    status: 'idle',
    summarizeArticle: summarize,
  });
  return null;
}

afterEach(cleanup);

describe('long article summary controls', () => {
  it('requires confirmation, supports cancellation, and submits explicit consent', () => {
    const summarizeArticle = vi.fn();
    render(
      <AiSummaryPanel
        article={article}
        input={prepareArticleSummaryInput(longText)}
        settings={settings}
        status="idle"
        stale={false}
        summarizeArticle={summarizeArticle}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Generate summary' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(summarizeArticle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(summarizeArticle).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Generate summary' }));
    fireEvent.click(screen.getByRole('button', { name: 'Summarize opening portion' }));
    expect(summarizeArticle).toHaveBeenCalledWith('a1', longText, {
      trigger: 'manual', allowPartial: true,
    });
  });

  it('skips partial automatic summaries but allows complete long articles', () => {
    const summarize = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<AutoSummaryProbe text={longText} summarize={summarize} />);
    expect(summarize).not.toHaveBeenCalled();
    const completeText = 'A'.repeat(31000);
    rerender(<AutoSummaryProbe text={completeText} summarize={summarize} />);
    expect(summarize).toHaveBeenCalledWith('a1', completeText, { trigger: 'auto' });
  });

  it('retains the saved partial summary and exposes a regeneration failure', () => {
    render(
      <AiSummaryPanel
        article={{
          ...article,
          aiSummary: {
            overview: 'Saved summary',
            keyPoints: [],
            generatedAt: 1,
            model: 'reader-model',
            sourceFingerprint: 'old',
            promptVersion: 1,
            isPartial: true,
            chunkCount: 5,
          },
        }}
        input={prepareArticleSummaryInput(longText)}
        settings={settings}
        status="error"
        stale={false}
        summarizeArticle={vi.fn()}
      />,
    );
    expect(screen.getByText('Saved summary')).toBeTruthy();
    expect(screen.getByText(/Partial summary:/)).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeTruthy();
  });

  it('does not carry confirmation over to a different article', () => {
    const summarizeArticle = vi.fn();
    const props = {
      input: prepareArticleSummaryInput(longText),
      settings,
      status: 'idle' as const,
      stale: false,
      summarizeArticle,
    };
    const { rerender } = render(<AiSummaryPanel article={article} {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate summary' }));
    rerender(<AiSummaryPanel article={{ ...article, id: 'a2' }} {...props} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(summarizeArticle).not.toHaveBeenCalled();
  });
});
