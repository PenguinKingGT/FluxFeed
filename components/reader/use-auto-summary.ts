import type { ArticleSummaryInput } from '@/lib/reader/prepare-article-content';
import { useEffect } from 'react';
import type { Article, Settings } from '@/lib/types';
import { isAiConfigured } from '@/lib/ai/ai-preferences';
import { DEFAULT_SETTINGS } from '@/lib/db';

interface UseAutoSummaryOptions {
  article: Article | null;
  input: ArticleSummaryInput | null;
  settings: Settings;
  status: 'idle' | 'loading' | 'success' | 'error';
  summarizeArticle: (
    articleId: string,
    contentText: string,
    options: { trigger: 'auto'; force?: boolean },
  ) => Promise<void>;
}

/** Reuses prepared eligibility data; automatic requests never permit partial processing. */
export function useAutoSummary({
  article,
  input,
  settings,
  status,
  summarizeArticle,
}: UseAutoSummaryOptions) {
  const articleId = article?.id ?? null;
  const hasSummary = Boolean(article?.aiSummary);
  const ai = settings.ai ?? DEFAULT_SETTINGS.ai;
  const enabled = ai.autoSummarizeOnOpen && ai.showArticleSummary !== false;
  const minimum = ai.autoSummarizeMinCharacters;
  const configured = isAiConfigured(ai);
  const contentText = input?.contentText ?? '';
  const isPartial = input?.plan.isPartial ?? false;
  const characterCount = input?.characterCount ?? 0;

  useEffect(() => {
    if (
      !articleId
      || isPartial
      || hasSummary
      || !enabled
      || !configured
      || status !== 'idle'
      || characterCount < 80
      || (minimum > 0 && characterCount < minimum)
    ) {
      return;
    }
    void summarizeArticle(articleId, contentText, { trigger: 'auto' });
  }, [
    articleId,
    characterCount,
    configured,
    contentText,
    enabled,
    hasSummary,
    isPartial,
    minimum,
    status,
    summarizeArticle,
  ]);
}
