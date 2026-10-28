import { z } from 'zod';
import type { StorageService } from '@/lib/db';
import type { AiPreferences, MessageResponse } from '@/lib/types';
import { AI_PROVIDERS } from './provider-settings';
import { ARTICLE_MAX_CHARACTERS, planArticleSummary } from './article-chunker';
import { createArticleFingerprint, generateArticleSummary } from './article-summary';
import { AiRequestError, type AiErrorCode } from './ai-errors';
import { countUnicodeCharacters, isAiConfigured, sanitizeAiPreferences } from './ai-preferences';
import type { AiSecretStorage } from './ai-secret-storage';
import type { AiCompletionClient } from './completion';
import {
  createDailyDigestFingerprint,
  createDailyDigestId,
  generateDailyDigest,
  getDailyDigestStats,
} from './daily-digest';
import type { DigestArticleInput } from './digest-chunker';

export interface AiRequest {
  action:
    | 'ARTICLE_SUMMARIZE'
    | 'DAILY_DIGEST_GET'
    | 'DAILY_DIGEST_GENERATE'
    | 'AI_CREDENTIAL_STATUS'
    | 'AI_CREDENTIAL_UPDATE'
    | 'AI_CONNECTION_TEST';
  payload?: unknown;
}

/**
 * Public seam: validated operations return safe results and commit only completed
 * work. Callers do not coordinate preferences, secrets, fingerprints, or SDK calls.
 */
export interface AiModule {
  execute(request: AiRequest): Promise<MessageResponse>;
}

interface AiModuleDependencies {
  storageService: Pick<StorageService,
    | 'getSettings'
    | 'getArticle'
    | 'updateArticle'
    | 'getArticles'
    | 'getFeeds'
    | 'getDailyDigest'
    | 'saveDailyDigest'
  >;
  aiSecretStorage: AiSecretStorage;
  createAiClient(settings: AiPreferences, apiKey: string): AiCompletionClient;
  now?: () => number;
}

const credentialScopeSchema = z.object({
  provider: z.enum(AI_PROVIDERS).default('openai-compatible'),
});

const articleInputSchema = z.object({
  articleId: z.string().min(1),
  contentText: z.string().max(ARTICLE_MAX_CHARACTERS + 1),
  force: z.boolean().optional(),
  allowPartial: z.boolean().optional(),
  trigger: z.enum(['manual', 'auto']),
});

const digestInputSchema = z.object({
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeZone: z.string().min(1).max(100),
  scope: z.enum(['all', 'unread']),
  startAt: z.number().finite(),
  endAt: z.number().finite(),
}).refine((value) => value.endAt > value.startAt
  && value.endAt - value.startAt <= 26 * 60 * 60 * 1000);

const digestGenerationSchema = digestInputSchema.safeExtend({
  articleExcerpts: z.array(z.object({
    articleId: z.string().min(1),
    textExcerpt: z.string().max(1500),
  })).max(200),
  force: z.boolean().optional(),
});

/** Rejects malformed runtime input before it can trigger storage or paid requests. */
function parseInput<T>(schema: z.ZodType<T>, raw: unknown, code: AiErrorCode): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new AiRequestError(code);
  }
  return result.data;
}

/** Owns AI workflows behind one interface; all I/O is supplied at construction. */
export function createAiModule(dependencies: AiModuleDependencies): AiModule {
  const { storageService, aiSecretStorage, createAiClient, now } = dependencies;

  /** Loads current preferences for every operation, without ever mixing in secrets. */
  async function loadPreferences(): Promise<AiPreferences> {
    const settings = await storageService.getSettings();
    const preferences = sanitizeAiPreferences(settings.ai);
    if (!isAiConfigured(preferences)) {
      throw new AiRequestError('AI_NOT_CONFIGURED');
    }
    return preferences;
  }

  /** Defers credential reads and SDK construction until a cache miss is confirmed. */
  async function loadClient(preferences: AiPreferences): Promise<AiCompletionClient> {
    return createAiClient(preferences, await aiSecretStorage.getApiKey(preferences.provider));
  }

  /** Enforces manual consent and automatic eligibility before checking or generating a cache. */
  async function summarizeArticle(raw: unknown): Promise<MessageResponse> {
    const input = parseInput(articleInputSchema, raw, 'AI_REQUEST_INVALID');
    const article = await storageService.getArticle(input.articleId);
    if (!article) {
      throw new AiRequestError('ARTICLE_NOT_FOUND');
    }
    const plan = planArticleSummary(input.contentText);
    if (plan.isPartial && (input.trigger === 'auto' || input.allowPartial !== true)) {
      throw new AiRequestError('AI_PARTIAL_CONFIRMATION_REQUIRED');
    }
    const characterCount = countUnicodeCharacters(input.contentText);
    if (characterCount < 80) {
      throw new AiRequestError('ARTICLE_CONTENT_TOO_SHORT');
    }
    const preferences = await loadPreferences();
    const fingerprint = await createArticleFingerprint(article, input.contentText, preferences);
    if (input.trigger === 'auto') {
      if (!preferences.autoSummarizeOnOpen) {
        throw new AiRequestError('AI_AUTO_SUMMARY_DISABLED');
      }
      if (characterCount < preferences.autoSummarizeMinCharacters) {
        throw new AiRequestError('AI_AUTO_SUMMARY_BELOW_THRESHOLD');
      }
      if (article.aiSummary) {
        return {
          success: true,
          data: {
            summary: article.aiSummary,
            cached: true,
            stale: article.aiSummary.sourceFingerprint !== fingerprint,
          },
        };
      }
    }
    if (!input.force && article.aiSummary?.sourceFingerprint === fingerprint) {
      return { success: true, data: { summary: article.aiSummary, cached: true, stale: false } };
    }

    const summary = await generateArticleSummary(
      await loadClient(preferences),
      article,
      input.contentText,
      preferences,
      fingerprint,
      now,
    );
    // Generation has no persistence side effects. Failed sections or synthesis
    // therefore leave the previous article cache intact.
    await storageService.updateArticle(article.id, { aiSummary: summary });
    return { success: true, data: { summary, cached: false, stale: false } };
  }

  /** Reads saved digests even when AI is no longer configured or the provider is offline. */
  async function readDigest(raw: unknown): Promise<MessageResponse> {
    const input = parseInput(digestInputSchema, raw, 'DAILY_DIGEST_INVALID_DATE');
    const digest = await storageService.getDailyDigest(
      createDailyDigestId(input.dayKey, input.timeZone, input.scope),
    );
    return { success: true, data: { digest: digest ?? null } };
  }

  /** Selects authoritative local records and saves a digest only after generation finishes. */
  async function generateDigest(raw: unknown): Promise<MessageResponse> {
    const input = parseInput(digestGenerationSchema, raw, 'DAILY_DIGEST_INVALID_DATE');
    const preferences = await loadPreferences();
    const allArticles = await storageService.getArticles({
      publishedAfter: input.startAt,
      publishedBefore: input.endAt,
    });
    const scopedArticles = input.scope === 'unread'
      ? allArticles.filter((article) => !article.isRead)
      : allArticles;
    if (scopedArticles.length === 0) {
      throw new AiRequestError('DAILY_DIGEST_EMPTY');
    }

    const excerptById = new Map(input.articleExcerpts.map((item) => [item.articleId, item.textExcerpt]));
    const feeds = await storageService.getFeeds();
    const feedById = new Map(feeds.map((feed) => [feed.id, feed]));
    const articles: DigestArticleInput[] = scopedArticles
      .slice(0, preferences.dailyDigestMaxArticles)
      .map((article) => ({
        articleId: article.id,
        title: article.title,
        source: feedById.get(article.feedId)?.title ?? 'FluxFeed',
        author: article.author,
        publishedAt: article.publishedAt,
        summary: '',
        contentExcerpt: excerptById.get(article.id) ?? '',
      }));
    const fingerprint = await createDailyDigestFingerprint(
      articles,
      preferences,
      input.dayKey,
      input.timeZone,
      input.scope,
    );
    const existing = await storageService.getDailyDigest(
      createDailyDigestId(input.dayKey, input.timeZone, input.scope),
    );
    if (!input.force && existing?.sourceFingerprint === fingerprint) {
      return {
        success: true,
        data: {
          digest: existing,
          cached: true,
          stats: getDailyDigestStats(scopedArticles.length, articles),
        },
      };
    }

    const result = await generateDailyDigest(await loadClient(preferences), {
      dayKey: input.dayKey,
      timeZone: input.timeZone,
      scope: input.scope,
      articles,
      totalArticles: scopedArticles.length,
      preferences,
      sourceFingerprint: fingerprint,
    }, now);
    await storageService.saveDailyDigest(result.digest);
    return { success: true, data: { ...result, cached: false } };
  }

  /** Validates key writes; only a presence flag crosses the module's interface. */
  async function updateCredential(raw: unknown): Promise<MessageResponse> {
    const input = parseInput(
      credentialScopeSchema.extend({ apiKey: z.string().max(10000) }),
      raw,
      'AI_REQUEST_INVALID',
    );
    await aiSecretStorage.setApiKey(input.apiKey, input.provider);
    return { success: true, data: { hasApiKey: await aiSecretStorage.hasApiKey(input.provider) } };
  }

  /** Makes a bounded completion against saved configuration without exposing the response. */
  async function testConnection(): Promise<MessageResponse> {
    const client = await loadClient(await loadPreferences());
    // Native reasoning models need room for reasoning before the short answer.
    await client.complete([
      { role: 'system', content: 'Return only the word OK.' },
      { role: 'user', content: 'Connection test.' },
    ], { maxTokens: 512 });
    return { success: true };
  }

  return {
    /** Contains all errors so SDK diagnostics and storage failures never leak to pages. */
    async execute(request) {
      try {
        switch (request.action) {
          case 'ARTICLE_SUMMARIZE':
            return await summarizeArticle(request.payload);
          case 'DAILY_DIGEST_GET':
            return await readDigest(request.payload);
          case 'DAILY_DIGEST_GENERATE':
            return await generateDigest(request.payload);
          case 'AI_CREDENTIAL_UPDATE':
            return await updateCredential(request.payload);
          case 'AI_CREDENTIAL_STATUS': {
            const input = parseInput(
              credentialScopeSchema, request.payload ?? {}, 'AI_REQUEST_INVALID',
            );
            return {
              success: true,
              data: { hasApiKey: await aiSecretStorage.hasApiKey(input.provider) },
            };
          }
          case 'AI_CONNECTION_TEST':
            return await testConnection();
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof AiRequestError ? error.code : 'AI_REQUEST_FAILED',
        };
      }
    },
  };
}
