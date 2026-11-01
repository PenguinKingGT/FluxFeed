import { countUnicodeCharacters } from '@/lib/ai/ai-preferences';
import { planArticleSummary, type ArticleSummaryPlan } from '@/lib/ai/article-chunker';
import { extractSanitizedText, sanitizeHtml } from '@/lib/security/sanitize-html';

export interface ArticleSummaryInput {
  contentText: string;
  characterCount: number;
  plan: ArticleSummaryPlan;
}

export interface PreparedArticleContent {
  sanitizedHtml: string;
  getSummaryInput(): ArticleSummaryInput;
}

/** Computes one reusable summary plan and Unicode count while retaining paragraph boundaries. */
export function prepareArticleSummaryInput(contentText: string): ArticleSummaryInput {
  return {
    contentText,
    characterCount: countUnicodeCharacters(contentText),
    plan: planArticleSummary(contentText),
  };
}

/**
 * Owns one article's sanitized source and lazily derived AI input. The reader memoizes
 * this object by HTML value; no global cache retains previously visited long articles.
 */
export function prepareArticleContent(html: string): PreparedArticleContent {
  const sanitizedHtml = sanitizeHtml(html);
  let summaryInput: ArticleSummaryInput | undefined;
  return {
    sanitizedHtml,
    getSummaryInput() {
      // Hidden or unconfigured AI never calls this; repeated visibility changes reuse the result.
      summaryInput ??= prepareArticleSummaryInput(extractSanitizedText(sanitizedHtml, true));
      return summaryInput;
    },
  };
}
