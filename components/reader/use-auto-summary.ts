import { useEffect } from 'react';
import type { Article, Settings } from '@/lib/types';
import { countUnicodeCharacters, isAiConfigured } from '@/lib/ai/ai-preferences';
import { DEFAULT_SETTINGS } from '@/lib/db';

interface UseAutoSummaryOptions {
  article: Article | null;
  contentText: string;
  settings: Settings;
  status: 'idle' | 'loading' | 'success' | 'error';
  summarizeArticle: (
    articleId: string,
    contentText: string,
    options: { trigger: 'auto'; force?: boolean },
  ) => Promise<void>;
}

export function useAutoSummary({
  article,
  contentText,
  settings,
  status,
  summarizeArticle,
}: UseAutoSummaryOptions) {
  const articleId = article?.id ?? null;
  const hasSummary = Boolean(article?.aiSummary);
  const ai = settings.ai ?? DEFAULT_SETTINGS.ai;
  const enabled = ai.autoSummarizeOnOpen;
  const minimum = ai.autoSummarizeMinCharacters;
  const configured = isAiConfigured(ai);
  const characterCount = countUnicodeCharacters(contentText);

  useEffect(() => {
    if (
      !articleId
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
    minimum,
    status,
    summarizeArticle,
  ]);
}
