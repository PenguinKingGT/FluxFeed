import { AiRequestError } from './ai-errors';
import { z } from 'zod';

export const articleSummarySchema = z.object({
  overview: z.string().trim().min(1).max(2000),
  keyPoints: z.array(z.string().trim().min(1).max(500)).max(5).default([]),
});

export type ArticleSummaryContent = z.infer<typeof articleSummarySchema>;

/** Removes the optional JSON fence without accepting surrounding commentary. */
function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

/** Multi-part summaries require valid structure to avoid caching missing sections. */
export function parseArticleSummary(value: string, strict = false): ArticleSummaryContent {
  const content = stripCodeFence(value);
  try {
    return articleSummarySchema.parse(JSON.parse(content));
  } catch {
    if (strict) {
      throw new AiRequestError('AI_RESPONSE_INVALID');
    }
    return articleSummarySchema.parse({
      overview: content.slice(0, 2000) || 'No summary was returned.',
      keyPoints: [],
    });
  }
}

