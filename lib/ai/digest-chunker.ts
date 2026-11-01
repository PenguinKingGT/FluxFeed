export interface DigestArticleInput {
  articleId: string;
  title: string;
  source: string;
  author: string;
  publishedAt: number;
  summary: string;
  contentExcerpt: string;
}

export function chunkDigestArticles(
  articles: DigestArticleInput[],
  maxArticles = 20,
  maxCharacters = 24000,
): DigestArticleInput[][] {
  const chunks: DigestArticleInput[][] = [];
  let current: DigestArticleInput[] = [];
  let currentLength = 0;

  for (const article of articles) {
    const length = JSON.stringify(article).length;
    if (current.length > 0 && (current.length >= maxArticles || currentLength + length > maxCharacters)) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(article);
    currentLength += length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

/** Stops dispatch on the first rejection and drains started tasks before exposing that failure. */
export async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;
  // A wrapper also preserves rejection with undefined, null, or another falsy value.
  let failure: { reason: unknown } | undefined;

  /** Claims work only while healthy; every started mapper is awaited even after another fails. */
  async function worker(): Promise<void> {
    while (!failure && nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await mapper(values[index], index);
      } catch (reason) {
        failure ??= { reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  if (failure) {
    throw failure.reason;
  }
  return results;
}
