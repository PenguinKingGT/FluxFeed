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

export async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return results;
}
