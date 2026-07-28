import type { StorageService } from '@/lib/db';
import {
  createArticleFingerprint,
  createDailyDigestFingerprint,
  createDailyDigestId,
  generateArticleSummary,
  generateDailyDigest,
  getDailyDigestStats,
  type AiCompletionClient,
  type AiSecretStorage,
  type DigestArticleInput,
} from '@/lib/ai';
import { AiRequestError } from '@/lib/ai/ai-client';
import { countUnicodeCharacters, isAiConfigured, sanitizeAiPreferences } from '@/lib/ai/ai-preferences';
import type { FetchFeedResult } from '@/lib/feed';
import { createRecordId } from '@/lib/id';
import type {
  BackgroundMessage,
  Feed,
  Message,
  MessageAction,
  MessageResponse,
  ParsedFeed,
  Settings,
  TreeNodeMove,
} from '@/lib/types';
import { convertParsedArticleToArticle } from './refresh-feeds';

interface MessageHandlerDependencies {
  storageService: Pick<
    StorageService,
    | 'saveFeed'
    | 'getFeeds'
    | 'getGroups'
    | 'saveGroup'
    | 'removeGroup'
    | 'moveTreeNode'
    | 'removeFeed'
    | 'getFeed'
    | 'getUnreadCount'
    | 'saveArticles'
    | 'bulkUpdateArticles'
    | 'getArticles'
    | 'updateArticle'
    | 'getSettings'
    | 'saveSettings'
    | 'getArticle'
    | 'getDailyDigest'
    | 'saveDailyDigest'
  >;
  fetchFeed(url: string): Promise<FetchFeedResult>;
  updateBadge(): Promise<void>;
  refreshSingleFeed(feed: Feed): Promise<number>;
  refreshAllFeeds(): Promise<number>;
  registerRefreshAlarm?: (intervalMinutes: number) => Promise<void>;
  sessionStorage?: {
    set(value: Record<string, unknown>): Promise<void> | void;
    get(key: string): Promise<Record<string, unknown>>;
  };
  senderTabId?: number;
  now?: () => number;
  aiSecretStorage?: AiSecretStorage;
  createAiClient?: (settings: Settings['ai'], apiKey: string) => AiCompletionClient;
}

interface FeedAddPayload {
  url: string;
  groupId?: string;
}

interface FeedIdPayload {
  feedId: string;
}

interface GroupCreatePayload {
  name: string;
  parentId?: string;
}

interface GroupIdPayload {
  groupId: string;
}

interface ArticleIdsPayload {
  articleIds: string[];
}

interface ArticleStarPayload {
  articleId: string;
  starred: boolean;
}

interface NormalizedMessage {
  action: MessageAction;
  payload?: unknown;
}

interface ArticleSummarizePayload {
  articleId: string;
  contentText: string;
  force?: boolean;
  trigger: 'manual' | 'auto';
}

interface DailyDigestPayload {
  dayKey: string;
  timeZone: string;
  scope: 'all' | 'unread';
  startAt: number;
  endAt: number;
  articleExcerpts?: Array<{ articleId: string; textExcerpt: string }>;
  force?: boolean;
}

function aiFailure(error: unknown): MessageResponse {
  if (error instanceof AiRequestError) {
    return { success: false, error: error.code };
  }
  return { success: false, error: 'AI_REQUEST_FAILED' };
}

function validateDigestPayload(payload: DailyDigestPayload): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(payload.dayKey)
    && Boolean(payload.timeZone)
    && ['all', 'unread'].includes(payload.scope)
    && Number.isFinite(payload.startAt)
    && Number.isFinite(payload.endAt)
    && payload.endAt > payload.startAt
    && payload.endAt - payload.startAt <= 26 * 60 * 60 * 1000;
}

function normalizeMessage(message: Message | BackgroundMessage): NormalizedMessage {
  if ('action' in message) {
    return message;
  }

  switch (message.type) {
    case 'ADD_FEED':
      return { action: 'FEED_ADD', payload: { url: message.url, groupId: message.groupId } };
    case 'REMOVE_FEED':
      return { action: 'FEED_DELETE', payload: { feedId: message.feedId } };
    case 'FETCH_NOW':
      return { action: 'FEED_REFRESH', payload: { feedId: message.feedId } };
    case 'MARK_READ':
      return { action: 'ARTICLE_MARK_READ', payload: { articleIds: message.articleIds } };
    case 'MARK_ALL_READ':
      return { action: 'ARTICLE_MARK_ALL_READ', payload: { feedId: message.feedId } };
    case 'STAR_ARTICLE':
      return {
        action: 'ARTICLE_STAR',
        payload: { articleId: message.articleId, starred: message.starred },
      };
    case 'GET_UNREAD_COUNT':
      return { action: 'GET_UNREAD_COUNT' };
    case 'SETTINGS_UPDATE':
      {
        const { type: _type, ...settings } = message;
        return { action: 'SETTINGS_UPDATE', payload: settings };
      }
    case 'FEEDS_DETECTED':
      return {
        action: 'PAGE_FEED_DETECTED',
        payload: {
          feeds: message.feeds,
          pageUrl: message.pageUrl,
          pageTitle: message.pageTitle,
        },
      };
    case 'GET_DETECTED_FEEDS':
      return { action: 'PAGE_FEED_DETECTED', payload: { query: true } };
  }
}

function createFeed(parsedFeed: ParsedFeed, url: string, createdAt: number, groupId?: string): Feed {
  return {
    id: createRecordId(),
    url,
    title: parsedFeed.title,
    description: parsedFeed.description,
    siteUrl: parsedFeed.siteUrl,
    iconUrl: parsedFeed.iconUrl,
    refreshInterval: 30,
    order: createdAt,
    errorCount: 0,
    createdAt,
    lastFetchedAt: createdAt,
    groupId,
  };
}

function normalizeFeedUrl(url: string): string {
  try {
    return new URL(url).href;
  } catch {
    return url.trim();
  }
}

export async function handleBackgroundMessage(
  input: Message | BackgroundMessage,
  dependencies: MessageHandlerDependencies,
): Promise<MessageResponse> {
  try {
    const message = normalizeMessage(input);

    switch (message.action) {
      case 'FEED_ADD': {
        const { url, groupId } = message.payload as FeedAddPayload;
        const existingFeed = (await dependencies.storageService.getFeeds()).find(
          (feed) => normalizeFeedUrl(feed.url) === normalizeFeedUrl(url),
        );

        if (existingFeed) {
          return { success: true, data: { feed: existingFeed, duplicate: true } };
        }

        const result = await dependencies.fetchFeed(url);

        if (!result.success || !result.feed) {
          return { success: false, error: result.error ?? 'Failed to fetch feed' };
        }

        const createdAt = dependencies.now?.() ?? Date.now();
        const feed = createFeed(result.feed, result.resolvedUrl ?? url, createdAt, groupId);
        await dependencies.storageService.saveFeed(feed);
        await dependencies.storageService.saveArticles(
          result.feed.articles.map((article) => convertParsedArticleToArticle(article, feed, createdAt)),
        );
        await dependencies.updateBadge();

        return { success: true, data: { feed } };
      }

      case 'FEED_DELETE': {
        const { feedId } = message.payload as FeedIdPayload;
        await dependencies.storageService.removeFeed(feedId);
        await dependencies.updateBadge();
        return { success: true };
      }

      case 'FEED_REFRESH': {
        const { feedId } = message.payload as Partial<FeedIdPayload>;

        if (feedId) {
          const feed = await dependencies.storageService.getFeed(feedId);

          if (!feed) {
            return { success: false, error: 'Feed not found' };
          }

          const count = await dependencies.refreshSingleFeed(feed);
          await dependencies.updateBadge();
          return { success: true, data: { count } };
        }

        const count = await dependencies.refreshAllFeeds();
        await dependencies.updateBadge();
        return { success: true, data: { count } };
      }

      case 'FEED_REFRESH_ALL': {
        const count = await dependencies.refreshAllFeeds();
        await dependencies.updateBadge();
        return { success: true, data: { count } };
      }

      case 'FEED_LIST': {
        const feeds = await dependencies.storageService.getFeeds();
        return { success: true, data: { feeds } };
      }

      case 'GROUP_LIST': {
        const groups = await dependencies.storageService.getGroups();
        return { success: true, data: { groups } };
      }

      case 'GROUP_CREATE': {
        const { name, parentId } = message.payload as GroupCreatePayload;
        const trimmedName = name.trim();

        if (!trimmedName) {
          return { success: false, error: 'Group name is required' };
        }

        const createdAt = dependencies.now?.() ?? Date.now();
        const group = {
          id: createRecordId(),
          name: trimmedName,
          parentId,
          order: createdAt,
          createdAt,
        };
        await dependencies.storageService.saveGroup(group);
        return { success: true, data: { group } };
      }

      case 'GROUP_DELETE': {
        const { groupId } = message.payload as GroupIdPayload;
        await dependencies.storageService.removeGroup(groupId);
        await dependencies.updateBadge();
        return { success: true };
      }

      case 'TREE_MOVE': {
        await dependencies.storageService.moveTreeNode(message.payload as TreeNodeMove);
        return { success: true };
      }

      case 'ARTICLE_MARK_READ': {
        const { articleIds } = message.payload as ArticleIdsPayload;
        await dependencies.storageService.bulkUpdateArticles(articleIds, { isRead: true });
        await dependencies.updateBadge();
        return { success: true };
      }

      case 'ARTICLE_LIST': {
        const options = (message.payload ?? {}) as {
          feedId?: string;
          groupId?: string;
          onlyUnread?: boolean;
          onlyStarred?: boolean;
          limit?: number;
          offset?: number;
          publishedAfter?: number;
          publishedBefore?: number;
        };
        const articles = await dependencies.storageService.getArticles(options);
        return { success: true, data: { articles } };
      }

      case 'ARTICLE_MARK_ALL_READ': {
        const { feedId } = (message.payload ?? {}) as Partial<FeedIdPayload>;
        const unreadArticles = await dependencies.storageService.getArticles({
          feedId,
          onlyUnread: true,
        });
        await dependencies.storageService.bulkUpdateArticles(
          unreadArticles.map((article) => article.id),
          { isRead: true },
        );
        await dependencies.updateBadge();
        return { success: true };
      }

      case 'ARTICLE_STAR': {
        const { articleId, starred } = message.payload as ArticleStarPayload;
        await dependencies.storageService.updateArticle(articleId, {
          isStarred: starred,
          starredAt: starred ? dependencies.now?.() ?? Date.now() : undefined,
        });
        return { success: true };
      }

      case 'ARTICLE_SUMMARIZE': {
        if (!dependencies.aiSecretStorage || !dependencies.createAiClient) {
          return { success: false, error: 'AI_NOT_AVAILABLE' };
        }
        const payload = message.payload as ArticleSummarizePayload;
        if (
          !payload?.articleId
          || typeof payload.contentText !== 'string'
          || payload.contentText.length > 30000
          || !['manual', 'auto'].includes(payload.trigger)
        ) {
          return { success: false, error: 'AI_REQUEST_INVALID' };
        }
        const article = await dependencies.storageService.getArticle(payload.articleId);
        if (!article) return { success: false, error: 'ARTICLE_NOT_FOUND' };

        const characterCount = countUnicodeCharacters(payload.contentText);
        if (characterCount < 80) {
          return { success: false, error: 'ARTICLE_CONTENT_TOO_SHORT' };
        }
        const settings = await dependencies.storageService.getSettings();
        const ai = sanitizeAiPreferences(settings.ai);
        if (!isAiConfigured(ai)) return { success: false, error: 'AI_NOT_CONFIGURED' };
        if (payload.trigger === 'auto') {
          if (!ai.autoSummarizeOnOpen) {
            return { success: false, error: 'AI_AUTO_SUMMARY_DISABLED' };
          }
          if (ai.autoSummarizeMinCharacters > 0 && characterCount < ai.autoSummarizeMinCharacters) {
            return { success: false, error: 'AI_AUTO_SUMMARY_BELOW_THRESHOLD' };
          }
          if (article.aiSummary) {
            return { success: true, data: { summary: article.aiSummary, cached: true, stale: true } };
          }
        }

        const fingerprint = await createArticleFingerprint(article, payload.contentText, ai);
        if (!payload.force && article.aiSummary?.sourceFingerprint === fingerprint) {
          return { success: true, data: { summary: article.aiSummary, cached: true, stale: false } };
        }

        try {
          const apiKey = await dependencies.aiSecretStorage.getApiKey();
          const client = dependencies.createAiClient(ai, apiKey);
          const summary = await generateArticleSummary(
            client,
            article,
            payload.contentText,
            ai,
            fingerprint,
            dependencies.now,
          );
          await dependencies.storageService.updateArticle(article.id, { aiSummary: summary });
          return { success: true, data: { summary, cached: false, stale: false } };
        } catch (error) {
          return aiFailure(error);
        }
      }

      case 'DAILY_DIGEST_GET': {
        const payload = message.payload as DailyDigestPayload;
        if (!validateDigestPayload(payload)) {
          return { success: false, error: 'DAILY_DIGEST_INVALID_DATE' };
        }
        const digest = await dependencies.storageService.getDailyDigest(
          createDailyDigestId(payload.dayKey, payload.timeZone, payload.scope),
        );
        return { success: true, data: { digest: digest ?? null } };
      }

      case 'DAILY_DIGEST_GENERATE': {
        if (!dependencies.aiSecretStorage || !dependencies.createAiClient) {
          return { success: false, error: 'AI_NOT_AVAILABLE' };
        }
        const payload = message.payload as DailyDigestPayload;
        if (!validateDigestPayload(payload) || !Array.isArray(payload.articleExcerpts)) {
          return { success: false, error: 'DAILY_DIGEST_INVALID_DATE' };
        }
        const settings = await dependencies.storageService.getSettings();
        const ai = sanitizeAiPreferences(settings.ai);
        if (!isAiConfigured(ai)) return { success: false, error: 'AI_NOT_CONFIGURED' };

        const allArticles = await dependencies.storageService.getArticles({
          publishedAfter: payload.startAt,
          publishedBefore: payload.endAt,
        });
        const scopedArticles = payload.scope === 'unread'
          ? allArticles.filter((article) => !article.isRead)
          : allArticles;
        if (scopedArticles.length === 0) {
          return { success: false, error: 'DAILY_DIGEST_EMPTY' };
        }

        const excerptById = new Map(
          payload.articleExcerpts
            .filter((item) => item && typeof item.articleId === 'string' && typeof item.textExcerpt === 'string')
            .slice(0, ai.dailyDigestMaxArticles)
            .map((item) => [item.articleId, item.textExcerpt.slice(0, 1500)]),
        );
        const feeds = await dependencies.storageService.getFeeds();
        const feedById = new Map(feeds.map((feed) => [feed.id, feed]));
        const selected = scopedArticles.slice(0, ai.dailyDigestMaxArticles);
        const digestArticles: DigestArticleInput[] = selected.map((article) => ({
          articleId: article.id,
          title: article.title,
          source: feedById.get(article.feedId)?.title ?? 'FluxFeed',
          author: article.author,
          publishedAt: article.publishedAt,
          summary: '',
          contentExcerpt: excerptById.get(article.id) ?? '',
        }));
        const fingerprint = await createDailyDigestFingerprint(
          digestArticles,
          ai,
          payload.dayKey,
          payload.timeZone,
          payload.scope,
        );
        const id = createDailyDigestId(payload.dayKey, payload.timeZone, payload.scope);
        const existing = await dependencies.storageService.getDailyDigest(id);
        if (!payload.force && existing?.sourceFingerprint === fingerprint) {
          return {
            success: true,
            data: {
              digest: existing,
              cached: true,
              stats: getDailyDigestStats(scopedArticles.length, digestArticles),
            },
          };
        }

        try {
          const apiKey = await dependencies.aiSecretStorage.getApiKey();
          const client = dependencies.createAiClient(ai, apiKey);
          const result = await generateDailyDigest(client, {
            dayKey: payload.dayKey,
            timeZone: payload.timeZone,
            scope: payload.scope,
            articles: digestArticles,
            totalArticles: scopedArticles.length,
            preferences: ai,
            sourceFingerprint: fingerprint,
          }, dependencies.now);
          await dependencies.storageService.saveDailyDigest(result.digest);
          return { success: true, data: { ...result, cached: false } };
        } catch (error) {
          return aiFailure(error);
        }
      }

      case 'GET_UNREAD_COUNT': {
        const count = await dependencies.storageService.getUnreadCount();
        return { success: true, data: { count } };
      }

      case 'SETTINGS_UPDATE': {
        const settings = message.payload as Partial<Settings>;
        if (settings.ai) {
          settings.ai = sanitizeAiPreferences(settings.ai);
        }
        await dependencies.storageService.saveSettings(settings);

        if (typeof settings.refreshInterval === 'number') {
          await dependencies.registerRefreshAlarm?.(settings.refreshInterval);
        }

        return { success: true };
      }

      case 'SETTINGS_GET': {
        const settings = await dependencies.storageService.getSettings();
        return { success: true, data: { settings } };
      }

      case 'AI_CREDENTIAL_STATUS': {
        if (!dependencies.aiSecretStorage) {
          return { success: false, error: 'AI_NOT_AVAILABLE' };
        }
        return {
          success: true,
          data: { hasApiKey: await dependencies.aiSecretStorage.hasApiKey() },
        };
      }

      case 'AI_CREDENTIAL_UPDATE': {
        if (!dependencies.aiSecretStorage) {
          return { success: false, error: 'AI_NOT_AVAILABLE' };
        }
        const apiKey = (message.payload as { apiKey?: unknown } | undefined)?.apiKey;
        if (typeof apiKey !== 'string' || apiKey.length > 10000) {
          return { success: false, error: 'AI_REQUEST_INVALID' };
        }
        await dependencies.aiSecretStorage.setApiKey(apiKey);
        return {
          success: true,
          data: { hasApiKey: await dependencies.aiSecretStorage.hasApiKey() },
        };
      }

      case 'AI_CONNECTION_TEST': {
        if (!dependencies.aiSecretStorage || !dependencies.createAiClient) {
          return { success: false, error: 'AI_NOT_AVAILABLE' };
        }
        const settings = await dependencies.storageService.getSettings();
        const ai = sanitizeAiPreferences(settings.ai);
        if (!isAiConfigured(ai)) return { success: false, error: 'AI_NOT_CONFIGURED' };
        try {
          const client = dependencies.createAiClient(ai, await dependencies.aiSecretStorage.getApiKey());
          await client.complete([
            { role: 'system', content: 'Return only the word OK.' },
            { role: 'user', content: 'Connection test.' },
          ]);
          return { success: true };
        } catch (error) {
          return aiFailure(error);
        }
      }

      case 'PAGE_FEED_DETECTED': {
        if (!dependencies.sessionStorage || dependencies.senderTabId === undefined) {
          return (message.payload as { query?: boolean } | undefined)?.query
            ? { success: true, data: null }
            : { success: false, error: 'Missing sender tab' };
        }

        const key = `detected_${dependencies.senderTabId}`;
        const payload = message.payload as
          | { query: true }
          | { feeds: unknown; pageUrl: string; pageTitle: string };

        if ('query' in payload) {
          const data = await dependencies.sessionStorage.get(key);
          return { success: true, data: data[key] ?? null };
        }

        await dependencies.sessionStorage.set({
          [key]: {
            feeds: payload.feeds,
            pageUrl: payload.pageUrl,
            pageTitle: payload.pageTitle,
            detectedAt: dependencies.now?.() ?? Date.now(),
          },
        });

        return { success: true };
      }

      default:
        return { success: false, error: 'Unsupported message action' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
