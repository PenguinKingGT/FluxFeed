import { describe, expect, it, vi } from 'vitest';
import { createArticleFingerprint, generateArticleSummary } from '@/lib/ai';
import { countUnicodeCharacters, sanitizeAiPreferences } from '@/lib/ai/ai-preferences';
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
});

