/** Bounds article input and cost independently of the configured model. */
export const ARTICLE_CHUNK_CHARACTERS = 30000;
export const ARTICLE_MAX_CHUNKS = 5;
export const ARTICLE_MAX_CHARACTERS = ARTICLE_CHUNK_CHARACTERS * ARTICLE_MAX_CHUNKS;
export const ARTICLE_SUMMARY_STRATEGY_VERSION = 1;

export interface ArticleSummaryPlan {
  chunks: string[];
  processedText: string;
  isPartial: boolean;
  estimatedRequests: number;
}

/**
 * Keeps a contiguous prefix, preferring paragraph boundaries in the latter half
 * of each chunk. The hard fallback handles articles without paragraph breaks.
 */
export function planArticleSummary(contentText: string): ArticleSummaryPlan {
  const chunks: string[] = [];
  let offset = 0;

  while (offset < contentText.length && chunks.length < ARTICLE_MAX_CHUNKS) {
    let end = Math.min(offset + ARTICLE_CHUNK_CHARACTERS, contentText.length);
    if (end < contentText.length) {
      const paragraphEnd = contentText.lastIndexOf('\n\n', end - 2);
      if (paragraphEnd >= offset + ARTICLE_CHUNK_CHARACTERS / 2) {
        end = paragraphEnd + 2;
      }

      // Never split a UTF-16 surrogate pair between requests.
      const previous = contentText.charCodeAt(end - 1);
      const next = contentText.charCodeAt(end);
      if (previous >= 0xD800 && previous <= 0xDBFF && next >= 0xDC00 && next <= 0xDFFF) {
        end -= 1;
      }
    }

    chunks.push(contentText.slice(offset, end));
    offset = end;
  }

  return {
    chunks,
    processedText: chunks.join(''),
    isPartial: offset < contentText.length,
    estimatedRequests: chunks.length > 1 ? chunks.length + 1 : chunks.length,
  };
}
