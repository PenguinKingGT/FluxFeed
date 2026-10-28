import { describe, expect, it, vi } from 'vitest';
import { createArticleFingerprint, generateArticleSummary } from '@/lib/ai';
import { countUnicodeCharacters, isAiConfigured, sanitizeAiPreferences } from '@/lib/ai/ai-preferences';
import { AiRequestError } from '@/lib/ai/ai-errors';
import type { AiMessage } from '@/lib/ai/completion';
import { ARTICLE_CHUNK_CHARACTERS, ARTICLE_MAX_CHARACTERS, planArticleSummary } from '@/lib/ai/article-chunker';
import { DEFAULT_SETTINGS } from '@/lib/db';

describe('AI article summary', () => {
  it('counts Unicode code points and clamps preferences', () => {
    expect(countUnicodeCharacters('中文🙂')).toBe(3);
    expect(sanitizeAiPreferences({
      ...DEFAULT_SETTINGS.ai,
      autoSummarizeMinCharacters: 99999,
      customInstructions: `  ${'x'.repeat(2100)}  `,
    })).toMatchObject({
      autoSummarizeMinCharacters: 50000,
      customInstructions: 'x'.repeat(2000),
    });
  });

  it('generates structured content and a stable fingerprint', async () => {
    const article = { id: 'a1', title: 'Title', author: 'Author' };
    const fingerprint = await createArticleFingerprint(article, 'Article body', DEFAULT_SETTINGS.ai);
    expect(await createArticleFingerprint(article, 'Article body', DEFAULT_SETTINGS.ai)).toBe(fingerprint);
    const client = {
      complete: vi.fn().mockResolvedValue('```json\n{"overview":"Summary","keyPoints":["One"]}\n```'),
    };
    const summary = await generateArticleSummary(
      client,
      article,
      'Article body',
      { ...DEFAULT_SETTINGS.ai, model: 'reader-model' },
      fingerprint,
      () => 123,
    );
    expect(summary).toMatchObject({
      overview: 'Summary',
      keyPoints: ['One'],
      generatedAt: 123,
      model: 'reader-model',
    });
  });

  it('keeps paragraph boundaries and an exact contiguous source prefix', () => {
    const first = `${'A'.repeat(20000)}\n\n`;
    const text = first + 'B'.repeat(20000);
    const plan = planArticleSummary(text);
    expect(plan.chunks).toEqual([first, 'B'.repeat(20000)]);
    expect(plan.processedText).toBe(text);
    expect(plan.isPartial).toBe(false);
    expect(plan.estimatedRequests).toBe(3);
  });

  it('limits oversized input to five chunks without breaking Unicode pairs', () => {
    const text = '🙂'.repeat(ARTICLE_MAX_CHARACTERS);
    const plan = planArticleSummary(text);
    expect(plan.chunks).toHaveLength(5);
    expect(plan.isPartial).toBe(true);
    expect(plan.estimatedRequests).toBe(6);
    expect(plan.processedText).toBe(text.slice(0, ARTICLE_MAX_CHARACTERS));
    for (const chunk of plan.chunks) {
      expect(chunk.length).toBeLessThanOrEqual(ARTICLE_CHUNK_CHARACTERS);
      expect(chunk.endsWith('🙂')).toBe(true);
    }
    const boundary = planArticleSummary('A'.repeat(ARTICLE_CHUNK_CHARACTERS - 1) + '🙂tail');
    expect(boundary.chunks[0]).toHaveLength(ARTICLE_CHUNK_CHARACTERS - 1);
    expect(boundary.chunks[1]).toBe('🙂tail');
  });

  it('distinguishes complete and partial cache entries for the same prefix', async () => {
    const article = { id: 'a1', title: 'Title' };
    const text = 'A'.repeat(ARTICLE_MAX_CHARACTERS);
    expect(await createArticleFingerprint(article, text, DEFAULT_SETTINGS.ai)).not.toBe(
      await createArticleFingerprint(article, text + 'tail', DEFAULT_SETTINGS.ai),
    );
  });

  it('uses at most two concurrent requests and synthesizes ordered section results', async () => {
    let active = 0;
    let peak = 0;
    let call = 0;
    const complete = vi.fn(async (_messages: AiMessage[]) => {
      const index = call++;
      peak = Math.max(peak, ++active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active -= 1;
      return JSON.stringify({ overview: `Section ${index}`, keyPoints: ['Point'] });
    });
    const summary = await generateArticleSummary(
      { complete },
      { title: 'Long article', author: '' },
      'A'.repeat(ARTICLE_MAX_CHARACTERS + 1),
      { ...DEFAULT_SETTINGS.ai, summaryLanguage: 'zh-CN', customInstructions: 'Focus on evidence' },
      'fingerprint',
    );
    expect(peak).toBe(2);
    expect(complete).toHaveBeenCalledTimes(6);
    expect(summary).toMatchObject({ overview: 'Section 5', isPartial: true, chunkCount: 5 });
    const messages = complete.mock.calls[5][0];
    expect(messages[0].content).toContain('Simplified Chinese');
    expect(messages[1].content).toContain('Focus on evidence');
    expect(messages[1].content.indexOf('Section 0')).toBeLessThan(
      messages[1].content.indexOf('Section 4'),
    );
  });

  it('waits for in-flight requests and stops before later chunks after failure', async () => {
    let active = 0;
    const complete = vi.fn(async () => {
      const index = complete.mock.calls.length;
      active += 1;
      try {
        await new Promise((resolve) => setTimeout(resolve, index === 1 ? 0 : 5));
        if (index === 1) {
          throw new AiRequestError('AI_TIMEOUT');
        }
        return '{"overview":"Valid","keyPoints":[]}';
      } finally {
        active -= 1;
      }
    });
    await expect(generateArticleSummary(
      { complete }, { title: 'Article', author: '' },
      'A'.repeat(ARTICLE_MAX_CHARACTERS), DEFAULT_SETTINGS.ai, 'fingerprint',
    )).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
    expect(complete).toHaveBeenCalledTimes(2);
    expect(active).toBe(0);
  });

  it('rejects malformed section output instead of synthesizing an incomplete result', async () => {
    const complete = vi.fn().mockResolvedValue('not structured output');
    await expect(generateArticleSummary(
      { complete }, { title: 'Article', author: '' },
      'A'.repeat(ARTICLE_CHUNK_CHARACTERS + 1), DEFAULT_SETTINGS.ai, 'fingerprint',
    )).rejects.toMatchObject({ code: 'AI_RESPONSE_INVALID' });
    expect(complete).toHaveBeenCalledTimes(2);
  });


  it('normalizes old settings and accepts native defaults without a URL override', async () => {
    const { provider: _provider, ...legacy } = DEFAULT_SETTINGS.ai;
    expect(sanitizeAiPreferences(legacy).provider).toBe('openai-compatible');
    expect(isAiConfigured({ ...legacy, apiUrl: '', model: 'x' })).toBe(false);
    expect(isAiConfigured({ ...legacy, provider: 'google', apiUrl: '', model: 'x' })).toBe(true);
    expect(isAiConfigured({ ...legacy, provider: 'anthropic', apiUrl: '', model: 'x' })).toBe(true);
    const article = { id: 'a1', title: 'Article' };
    const preferences = { ...legacy, apiUrl: '', model: 'same-model' };
    expect(await createArticleFingerprint(article, 'Source text', {
      ...preferences, provider: 'google',
    })).not.toBe(await createArticleFingerprint(article, 'Source text', {
      ...preferences, provider: 'anthropic',
    }));
  });

});

