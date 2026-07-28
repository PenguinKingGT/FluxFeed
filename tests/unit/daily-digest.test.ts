import { describe, expect, it, vi } from 'vitest';
import { AiRequestError, generateDailyDigest } from '@/lib/ai';
import { DEFAULT_SETTINGS } from '@/lib/db';

describe('daily digest generation', () => {
  it('drops unknown IDs, fills missing entries, and preserves local titles', async () => {
    const client = {
      complete: vi.fn()
        .mockResolvedValueOnce(JSON.stringify({
          entries: [
            { articleId: 'a1', brief: 'Generated brief', whyItMatters: 'Useful', topics: ['AI'] },
            { articleId: 'unknown', brief: 'Bad', whyItMatters: '', topics: [] },
          ],
          topicHints: ['AI'],
        }))
        .mockResolvedValueOnce(JSON.stringify({
          overview: 'Today overview',
          topics: [{ name: 'AI', overview: 'AI news', articleIds: ['a1', 'unknown'] }],
        })),
    };
    const articles = [
      { articleId: 'a1', title: 'Local title', source: 'Feed', author: '', publishedAt: 2, summary: '', contentExcerpt: 'Body one' },
      { articleId: 'a2', title: 'Second title', source: 'Feed', author: '', publishedAt: 1, summary: 'Fallback', contentExcerpt: 'Body two' },
    ];
    const result = await generateDailyDigest(client, {
      dayKey: '2026-07-28',
      timeZone: 'Asia/Shanghai',
      scope: 'all',
      articles,
      totalArticles: 2,
      preferences: { ...DEFAULT_SETTINGS.ai, model: 'reader-model' },
      sourceFingerprint: 'fingerprint',
    }, () => 123);

    expect(result.digest.entries).toHaveLength(2);
    expect(result.digest.entries[0]).toMatchObject({ articleId: 'a1', title: 'Local title', brief: 'Generated brief' });
    expect(result.digest.entries[1]).toMatchObject({ articleId: 'a2', brief: 'Fallback' });
    expect(result.digest.topics[0].articleIds).toEqual(['a1']);
    expect(result.stats.estimatedRequests).toBe(2);
  });

  it('continues remaining chunks when one chunk returns malformed content', async () => {
    const articles = Array.from({ length: 21 }, (_, index) => ({
      articleId: `a${index}`,
      title: `Article ${index}`,
      source: 'Feed',
      author: '',
      publishedAt: index,
      summary: `Fallback ${index}`,
      contentExcerpt: `Body ${index}`,
    }));
    const client = {
      complete: vi.fn()
        .mockResolvedValueOnce('not json')
        .mockResolvedValueOnce(JSON.stringify({
          entries: [{
            articleId: 'a20',
            brief: 'Generated final entry',
            whyItMatters: '',
            topics: [],
          }],
          topicHints: [],
        }))
        .mockResolvedValueOnce(JSON.stringify({
          overview: 'Today overview',
          topics: [],
        })),
    };

    const result = await generateDailyDigest(client, {
      dayKey: '2026-07-28',
      timeZone: 'Asia/Shanghai',
      scope: 'all',
      articles,
      totalArticles: articles.length,
      preferences: { ...DEFAULT_SETTINGS.ai, model: 'reader-model' },
      sourceFingerprint: 'fingerprint',
    });

    expect(client.complete).toHaveBeenCalledTimes(3);
    expect(result.digest.entries[0].brief).toBe('Fallback 0');
    expect(result.digest.entries[20].brief).toBe('Generated final entry');
  });

  it('continues to synthesis when one chunk times out', async () => {
    const articles = Array.from({ length: 21 }, (_, index) => ({
      articleId: `a${index}`,
      title: `Article ${index}`,
      source: 'Feed',
      author: '',
      publishedAt: index,
      summary: `Fallback ${index}`,
      contentExcerpt: `Body ${index}`,
    }));
    const client = {
      complete: vi.fn()
        .mockRejectedValueOnce(new AiRequestError('AI_TIMEOUT'))
        .mockResolvedValueOnce(JSON.stringify({
          entries: [{
            articleId: 'a20',
            brief: 'Generated final entry',
            whyItMatters: '',
            topics: [],
          }],
          topicHints: [],
        }))
        .mockResolvedValueOnce(JSON.stringify({
          overview: 'Today overview',
          topics: [],
        })),
    };

    const result = await generateDailyDigest(client, {
      dayKey: '2026-07-28',
      timeZone: 'Asia/Shanghai',
      scope: 'all',
      articles,
      totalArticles: articles.length,
      preferences: { ...DEFAULT_SETTINGS.ai, model: 'reader-model' },
      sourceFingerprint: 'fingerprint',
    });

    expect(client.complete).toHaveBeenCalledTimes(3);
    expect(result.digest.overview).toBe('Today overview');
    expect(result.digest.entries[0].brief).toBe('Fallback 0');
  });

  it('returns completed entry summaries when final synthesis times out', async () => {
    const client = {
      complete: vi.fn()
        .mockResolvedValueOnce(JSON.stringify({
          entries: [{
            articleId: 'a1',
            brief: 'Generated brief',
            whyItMatters: 'Useful',
            topics: ['AI'],
          }],
          topicHints: ['AI'],
        }))
        .mockRejectedValueOnce(new AiRequestError('AI_TIMEOUT')),
    };

    const result = await generateDailyDigest(client, {
      dayKey: '2026-07-28',
      timeZone: 'Asia/Shanghai',
      scope: 'all',
      articles: [{
        articleId: 'a1',
        title: 'Article',
        source: 'Feed',
        author: '',
        publishedAt: 1,
        summary: '',
        contentExcerpt: 'Body',
      }],
      totalArticles: 1,
      preferences: { ...DEFAULT_SETTINGS.ai, model: 'reader-model' },
      sourceFingerprint: 'fingerprint',
    });

    expect(result.digest.overview).toBe('Generated brief');
    expect(result.digest.topics).toEqual([{
      name: 'AI',
      overview: 'Generated brief',
      articleIds: ['a1'],
    }]);
  });

  it('sends a compact payload to final synthesis', async () => {
    const client = {
      complete: vi.fn()
        .mockResolvedValueOnce(JSON.stringify({
          entries: [{
            articleId: 'a1',
            brief: 'Generated brief',
            whyItMatters: 'Useful',
            topics: ['AI'],
          }],
          topicHints: ['AI'],
        }))
        .mockResolvedValueOnce(JSON.stringify({
          overview: 'Today overview',
          topics: [],
        })),
    };

    await generateDailyDigest(client, {
      dayKey: '2026-07-28',
      timeZone: 'Asia/Shanghai',
      scope: 'all',
      articles: [{
        articleId: 'a1',
        title: 'Large local title',
        source: 'Feed',
        author: 'Author',
        publishedAt: 1,
        summary: '',
        contentExcerpt: 'Large original body',
      }],
      totalArticles: 1,
      preferences: { ...DEFAULT_SETTINGS.ai, model: 'reader-model' },
      sourceFingerprint: 'fingerprint',
    });

    const synthesisMessages = client.complete.mock.calls[1][0];
    const synthesisInput = JSON.parse(synthesisMessages[1].content);
    expect(synthesisInput.entries).toEqual([{
      articleId: 'a1',
      brief: 'Generated brief',
      topics: ['AI'],
    }]);
    expect(client.complete.mock.calls[1][1]).toEqual({ maxTokens: 1600 });
  });

  it('extracts JSON wrapped in model commentary and truncates oversized fields', async () => {
    const client = {
      complete: vi.fn()
        .mockResolvedValueOnce(`Here is the result:
\`\`\`json
${JSON.stringify({
    entries: [{
      articleId: 'a1',
      brief: 'x'.repeat(900),
      whyItMatters: '',
      topics: ['one', 'two', 'three', 'four'],
    }],
    topicHints: [],
  })}
\`\`\``)
        .mockResolvedValueOnce(JSON.stringify({
          overview: 'Today overview',
          topics: [],
        })),
    };

    const result = await generateDailyDigest(client, {
      dayKey: '2026-07-28',
      timeZone: 'Asia/Shanghai',
      scope: 'all',
      articles: [{
        articleId: 'a1',
        title: 'Article',
        source: 'Feed',
        author: '',
        publishedAt: 1,
        summary: '',
        contentExcerpt: 'Body',
      }],
      totalArticles: 1,
      preferences: { ...DEFAULT_SETTINGS.ai, model: 'reader-model' },
      sourceFingerprint: 'fingerprint',
    });

    expect(result.digest.entries[0].brief).toHaveLength(800);
    expect(result.digest.entries[0].topics).toHaveLength(3);
  });
});
