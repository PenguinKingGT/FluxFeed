import type { StorageService } from '@/lib/db';
import type { AiModule } from '@/lib/ai/ai-module';
import type { FetchFeedResult } from '@/lib/feed';
import { createRecordId } from '@/lib/id';
import type {
  BackgroundMessage,
  Feed,
  Message,
  MessageAction,
  MessageResponse,
  ParsedFeed,
  SettingsPatch,
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
    | 'commitFeedRefresh'
    | 'bulkUpdateArticles'
    | 'getArticles'
    | 'updateArticle'
    | 'getSettings'
    | 'saveSettings'
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
  ai?: AiModule;
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

/** Routes background operations and converts dependency failures into stable message responses. */
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
        await dependencies.storageService.commitFeedRefresh(
          feed.id,
          result.feed.articles.map((article) => convertParsedArticleToArticle(article, feed, createdAt)),
          {
            title: feed.title,
            iconUrl: feed.iconUrl,
            lastFetchedAt: createdAt,
            errorCount: 0,
          },
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

      case 'ARTICLE_SUMMARIZE':
      case 'DAILY_DIGEST_GET':
      case 'DAILY_DIGEST_GENERATE':
      case 'AI_CREDENTIAL_STATUS':
      case 'AI_CREDENTIAL_UPDATE':
      case 'AI_CONNECTION_TEST': {
        if (!dependencies.ai) {
          return { success: false, error: 'AI_NOT_AVAILABLE' };
        }
        return await dependencies.ai.execute({ action: message.action, payload: message.payload });
      }

      case 'GET_UNREAD_COUNT': {
        const count = await dependencies.storageService.getUnreadCount();
        return { success: true, data: { count } };
      }

      case 'SETTINGS_UPDATE': {
        const settings = message.payload as SettingsPatch;
        const saved = await dependencies.storageService.saveSettings(settings);

        if (typeof settings.refreshInterval === 'number') {
          await dependencies.registerRefreshAlarm?.(settings.refreshInterval);
        }

        return { success: true, data: { settings: saved } };
      }

      case 'SETTINGS_GET': {
        const settings = await dependencies.storageService.getSettings();
        return { success: true, data: { settings } };
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
