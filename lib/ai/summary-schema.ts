import { z } from 'zod';

export const articleSummarySchema = z.object({
  overview: z.string().trim().min(1).max(2000),
  keyPoints: z.array(z.string().trim().min(1).max(500)).max(5).default([]),
});

export type ArticleSummaryContent = z.infer<typeof articleSummarySchema>;

function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

export function parseArticleSummary(value: string): ArticleSummaryContent {
  const content = stripCodeFence(value);
  try {
    return articleSummarySchema.parse(JSON.parse(content));
  } catch {
    return articleSummarySchema.parse({
      overview: content.slice(0, 2000) || 'No summary was returned.',
      keyPoints: [],
    });
  }
}

