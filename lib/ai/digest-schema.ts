import { z } from 'zod';

const chunkEntrySchema = z.object({
  articleId: z.string().min(1),
  brief: z.string().trim().min(1).transform((value) => value.slice(0, 800)),
  whyItMatters: z.string().trim().transform((value) => value.slice(0, 500)).default(''),
  topics: z.array(
    z.string().trim().min(1).transform((value) => value.slice(0, 80)),
  ).transform((value) => value.slice(0, 3)).default([]),
});

export const digestChunkSchema = z.object({
  entries: z.array(chunkEntrySchema),
  topicHints: z.array(
    z.string().trim().min(1).transform((value) => value.slice(0, 80)),
  ).transform((value) => value.slice(0, 8)).default([]),
});

export const digestSynthesisSchema = z.object({
  overview: z.string().trim().min(1).transform((value) => value.slice(0, 4000)),
  topics: z.array(z.object({
    name: z.string().trim().min(1).transform((value) => value.slice(0, 80)),
    overview: z.string().trim().min(1).transform((value) => value.slice(0, 800)),
    articleIds: z.array(z.string().min(1)).transform((value) => value.slice(0, 200)),
  })).transform((value) => value.slice(0, 8)),
});

export type DigestChunkContent = z.infer<typeof digestChunkSchema>;
export type DigestSynthesisContent = z.infer<typeof digestSynthesisSchema>;

function parseJson(value: string): unknown {
  const trimmed = value.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart < 0 || objectEnd <= objectStart) {
    return JSON.parse(trimmed);
  }
  return JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
}

export function parseDigestChunk(value: string): DigestChunkContent {
  return digestChunkSchema.parse(parseJson(value));
}

export function parseDigestSynthesis(value: string): DigestSynthesisContent {
  return digestSynthesisSchema.parse(parseJson(value));
}
