import { describe, expect, it } from 'vitest';
import { chunkDigestArticles, mapWithConcurrency, type DigestArticleInput } from '@/lib/ai/digest-chunker';

function article(index: number, contentExcerpt = 'text'): DigestArticleInput {
  return {
    articleId: `a${index}`,
    title: `Article ${index}`,
    source: 'Feed',
    author: '',
    publishedAt: index,
    summary: '',
    contentExcerpt,
  };
}

describe('digest chunker', () => {
  it('limits each chunk by article count', () => {
    const chunks = chunkDigestArticles(Array.from({ length: 45 }, (_, index) => article(index)));
    expect(chunks.map((chunk) => chunk.length)).toEqual([20, 20, 5]);
  });

  it('starts a new chunk before exceeding the character budget', () => {
    const chunks = chunkDigestArticles([article(1, 'x'.repeat(1000)), article(2, 'x'.repeat(1000))], 20, 1500);
    expect(chunks).toHaveLength(2);
  });

  it('caps concurrent work', async () => {
    let active = 0;
    let maximum = 0;
    const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (value) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });
    expect(maximum).toBe(2);
    expect(result).toEqual([2, 4, 6, 8]);
  });
});

