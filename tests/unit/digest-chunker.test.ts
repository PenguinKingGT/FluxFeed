import { describe, expect, it, vi } from 'vitest';
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

  it('stops claiming work on failure and waits for started work before rejecting', async () => {
    let finish!: () => void;
    const inFlight = new Promise<void>((resolve) => { finish = resolve; });
    const failure = new Error('terminal failure');
    const mapper = vi.fn(async (value: number) => {
      if (value === 0) {
        throw failure;
      }
      await inFlight;
      return value;
    });
    let settled = false;
    const outcome = mapWithConcurrency([0, 1, 2, 3], 2, mapper)
      .then(() => ({ error: null }), (error: unknown) => ({ error }))
      .finally(() => { settled = true; });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(settled).toBe(false);
    finish();
    expect(await outcome).toEqual({ error: failure });
    expect(mapper.mock.calls.map(([value]) => value)).toEqual([0, 1]);
  });


  it('preserves the first failure even when an in-flight request also rejects', async () => {
    let failSecond!: (error: unknown) => void;
    const second = new Promise<number>((_resolve, reject) => { failSecond = reject; });
    const mapper = vi.fn((value: number): Promise<number> => {
      if (value === 0) {
        return Promise.reject(undefined);
      }
      return second;
    });
    const outcome = mapWithConcurrency([0, 1, 2], 2, mapper)
      .then(() => ({ failed: false }), (reason: unknown) => ({ failed: true, reason }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    failSecond(new Error('secondary failure'));
    expect(await outcome).toEqual({ failed: true, reason: undefined });
    expect(mapper).toHaveBeenCalledTimes(2);
  });

  it('keeps input order when requests finish in a different order', async () => {
    let finishFirst!: (value: number) => void;
    const first = new Promise<number>((resolve) => { finishFirst = resolve; });
    const pending = mapWithConcurrency([0, 1, 2], 2, async (value) => value === 0 ? first : value);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    finishFirst(0);
    expect(await pending).toEqual([0, 1, 2]);
  });

});

