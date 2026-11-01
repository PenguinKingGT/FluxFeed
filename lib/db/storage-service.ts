import Dexie from 'dexie';
import type { Article, DailyDigest, Feed, Group, Settings, SettingsPatch, TreeNodeMove } from '@/lib/types';
import type { FluxFeedDatabase } from './database';
import { mergeSettings } from '@/lib/settings/settings-values';
import { sanitizeAiPreferences } from '@/lib/ai/ai-preferences';
import { queryArticles, type GetArticlesOptions } from './article-query';
import { deletePrunableCandidates } from './article-pruning';

export type { GetArticlesOptions } from './article-query';

export type FeedRefreshPatch = Pick<Feed, 'title' | 'iconUrl' | 'lastFetchedAt' | 'errorCount'>;

export interface StorageService {
  getFeed(feedId: string): Promise<Feed | undefined>;
  getFeeds(): Promise<Feed[]>;
  saveFeed(feed: Feed): Promise<void>;
  removeFeed(feedId: string): Promise<void>;
  updateFeed(feedId: string, patch: Partial<Feed>): Promise<void>;
  getGroups(): Promise<Group[]>;
  saveGroup(group: Group): Promise<void>;
  removeGroup(groupId: string): Promise<void>;
  moveTreeNode(move: TreeNodeMove): Promise<void>;
  getArticles(options?: GetArticlesOptions): Promise<Article[]>;
  getArticleGuids(feedId: string): Promise<string[]>;
  getArticle(articleId: string): Promise<Article | undefined>;
  saveArticles(articles: Article[]): Promise<void>;
  commitFeedRefresh(feedId: string, articles: Article[], patch: FeedRefreshPatch): Promise<number>;
  updateArticle(articleId: string, patch: Partial<Article>): Promise<void>;
  bulkUpdateArticles(articleIds: string[], patch: Partial<Article>): Promise<void>;
  removeArticlesByFeed(feedId: string): Promise<void>;
  pruneOldArticles(retentionDays: number): Promise<void>;
  pruneExcessArticles(maxArticlesPerFeed: number): Promise<void>;
  getUnreadCount(): Promise<number>;
  getSettings(): Promise<Settings>;
  saveSettings(settings: SettingsPatch): Promise<Settings>;
  getDailyDigest(id: string): Promise<DailyDigest | undefined>;
  saveDailyDigest(digest: DailyDigest): Promise<void>;
  removeDailyDigestsBefore(timestamp: number): Promise<void>;
}

/** Reads compound index keys only, joining the caller's transaction when one is active. */
async function readFeedArticleGuids(database: FluxFeedDatabase, feedId: string): Promise<string[]> {
  const keys = await database.articles.where('[feedId+guid]')
    .between([feedId, Dexie.minKey], [feedId, Dexie.maxKey])
    .keys();
  return keys.map((key) => {
    // Dexie's generic key type does not encode this compound index's shape.
    if (!Array.isArray(key) || typeof key[1] !== 'string') {
      throw new Error('Invalid article GUID index key');
    }
    return key[1];
  });
}

export function createStorageService(database: FluxFeedDatabase): StorageService {
  return {
    async getFeed(feedId) {
      return database.feeds.get(feedId);
    },

    async getFeeds() {
      return (await database.feeds.toArray()).sort((left, right) => left.createdAt - right.createdAt);
    },

    async saveFeed(feed) {
      await database.feeds.put(feed);
    },

    async removeFeed(feedId) {
      await database.transaction('rw', database.feeds, database.articles, async () => {
        await database.feeds.delete(feedId);
        await database.articles.where('feedId').equals(feedId).delete();
      });
    },

    async updateFeed(feedId, patch) {
      await database.feeds.update(feedId, patch);
    },

    async getGroups() {
      return (await database.groups.toArray()).sort((left, right) => left.order - right.order);
    },

    async saveGroup(group) {
      if (group.parentId) {
        const parent = await database.groups.get(group.parentId);

        if (!parent) {
          throw new Error('Parent group not found');
        }

        if (parent.parentId) {
          throw new Error('Groups can only be nested two levels deep');
        }
      }

      await database.groups.put(group);
    },

    async removeGroup(groupId) {
      await database.transaction('rw', database.groups, database.feeds, database.articles, async () => {
        const groups = await database.groups.toArray();
        if (!groups.some((group) => group.id === groupId)) {
          throw new Error('Group not found');
        }

        const groupIds = new Set([groupId]);
        let foundChild = true;
        while (foundChild) {
          foundChild = false;
          for (const group of groups) {
            if (group.parentId && groupIds.has(group.parentId) && !groupIds.has(group.id)) {
              groupIds.add(group.id);
              foundChild = true;
            }
          }
        }

        const feedIds = (await database.feeds.toArray())
          .filter((feed) => feed.groupId && groupIds.has(feed.groupId))
          .map((feed) => feed.id);

        if (feedIds.length > 0) {
          await database.articles.where('feedId').anyOf(feedIds).delete();
          await database.feeds.bulkDelete(feedIds);
        }
        await database.groups.bulkDelete([...groupIds]);
      });
    },

    async moveTreeNode(move) {
      await database.transaction('rw', database.groups, database.feeds, async () => {
        const groups = await database.groups.toArray();
        const feeds = await database.feeds.toArray();

        if (move.nodeType === 'folder') {
          const node = groups.find((group) => group.id === move.nodeId);
          if (!node) throw new Error('Group not found');
          if (move.parentId === node.id) throw new Error('A folder cannot contain itself');

          const parent = move.parentId ? groups.find((group) => group.id === move.parentId) : undefined;
          if (move.parentId && !parent) throw new Error('Parent group not found');
          if (parent?.parentId) throw new Error('Groups can only be nested two levels deep');
          if (move.parentId && groups.some((group) => group.parentId === node.id)) {
            throw new Error('A folder with child folders cannot be nested');
          }

          const siblings = groups
            .filter((group) => group.id !== node.id && (group.parentId ?? null) === move.parentId)
            .sort((left, right) => left.order - right.order);
          const targetIndex = Math.max(0, Math.min(move.index, siblings.length));
          siblings.splice(targetIndex, 0, { ...node, parentId: move.parentId ?? undefined });

          await database.groups.bulkPut(
            siblings.map((group, index) => ({
              ...group,
              parentId: move.parentId ?? undefined,
              order: index,
            })),
          );
          return;
        }

        const node = feeds.find((feed) => feed.id === move.nodeId);
        if (!node) throw new Error('Feed not found');
        if (move.parentId && !groups.some((group) => group.id === move.parentId)) {
          throw new Error('Parent group not found');
        }

        const siblings = feeds
          .filter((feed) => feed.id !== node.id && (feed.groupId ?? null) === move.parentId)
          .sort((left, right) => (left.order ?? left.createdAt) - (right.order ?? right.createdAt));
        const targetIndex = Math.max(0, Math.min(move.index, siblings.length));
        siblings.splice(targetIndex, 0, { ...node, groupId: move.parentId ?? undefined });

        await database.feeds.bulkPut(
          siblings.map((feed, index) => ({
            ...feed,
            groupId: move.parentId ?? undefined,
            order: index,
          })),
        );
      });
    },

    /** Queries articles without eagerly loading unrelated source bodies. */
    async getArticles(options = {}) {
      return queryArticles(database, options);
    },

    /** Reads GUIDs from compound index keys only, never materializing article bodies. */
    async getArticleGuids(feedId) {
      return readFeedArticleGuids(database, feedId);
    },

    async getArticle(articleId) {
      return database.articles.get(articleId);
    },

    async saveArticles(articles) {
      await database.articles.bulkPut(articles);
    },

    /** Atomically inserts unseen GUIDs for a live feed and returns the actual inserted count. */
    async commitFeedRefresh(feedId, articles, patch) {
      if (articles.some((article) => article.feedId !== feedId)) {
        throw new Error('Refresh articles must belong to the refreshed feed');
      }

      return database.transaction('rw', database.feeds, database.articles, async () => {
        const feed = await database.feeds.get(feedId);
        if (!feed) {
          return 0;
        }

        // Feed and folder deletion use these same stores: whichever commits first
        // wins, without leaving articles whose parent was deleted during the request.
        const seenGuids = new Set(await readFeedArticleGuids(database, feedId));
        const newArticles: Article[] = [];
        for (const article of articles) {
          if (seenGuids.has(article.guid)) {
            continue;
          }
          seenGuids.add(article.guid);
          newArticles.push(article);
        }

        // Rechecking inside the write transaction serializes competing refreshes,
        // including other database connections. Updating the set also deduplicates this response.
        if (newArticles.length > 0) {
          await database.articles.bulkAdd(newArticles);
        }
        await database.feeds.update(feedId, patch);
        return newArticles.length;
      });
    },

    async updateArticle(articleId, patch) {
      await database.articles.update(articleId, patch);
    },

    async bulkUpdateArticles(articleIds, patch) {
      await database.transaction('rw', database.articles, async () => {
        await Promise.all(
          articleIds.map((articleId) => database.articles.update(articleId, patch)),
        );
      });
    },

    async removeArticlesByFeed(feedId) {
      await database.articles.where('feedId').equals(feedId).delete();
    },

    /** Selects expired candidates, then revalidates their current protection state before deletion. */
    async pruneOldArticles(retentionDays) {
      if (retentionDays <= 0) {
        return;
      }

      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      const oldArticles = await database.articles
        .filter((article) => article.fetchedAt < cutoff && article.isRead && !article.isStarred)
        .primaryKeys();

      await deletePrunableCandidates(database, oldArticles.map(String), cutoff);
    },

    /** Selects the oldest excess candidates without locking all feeds during discovery. */
    async pruneExcessArticles(maxArticlesPerFeed) {
      if (maxArticlesPerFeed <= 0) {
        return;
      }

      const feeds = await database.feeds.toArray();
      const articleIdsToDelete: string[] = [];

      for (const feed of feeds) {
        const articles = await database.articles
          .where('feedId')
          .equals(feed.id)
          .toArray();
        const removeCount = Math.max(0, articles.length - maxArticlesPerFeed);

        if (removeCount === 0) {
          continue;
        }

        const removable = articles
          .filter((article) => article.isRead && !article.isStarred)
          .sort((left, right) => left.publishedAt - right.publishedAt)
          .slice(0, removeCount);
        articleIdsToDelete.push(...removable.map((article) => article.id));
      }

      await deletePrunableCandidates(database, articleIdsToDelete);
    },

    async getUnreadCount() {
      return database.articles.filter((article) => !article.isRead).count();
    },

    /** Reads a default-completed view without persisting or overwriting stored preferences. */
    async getSettings() {
      return mergeSettings(await database.settings.get('global'));
    },

    /** Merges a patch against the latest record atomically, returning the canonical saved values. */
    async saveSettings(patch) {
      return database.transaction('rw', database.settings, async () => {
        const settings = mergeSettings(await database.settings.get('global'), patch);
        if (patch.ai) {
          // Normalize only after merging so a partial AI patch cannot reset unrelated fields.
          settings.ai = sanitizeAiPreferences(settings.ai);
        }
        await database.settings.put(settings);
        return settings;
      });
    },

    async getDailyDigest(id) {
      return database.dailyDigests.get(id);
    },

    async saveDailyDigest(digest) {
      await database.dailyDigests.put(digest);
    },

    async removeDailyDigestsBefore(timestamp) {
      await database.dailyDigests.where('generatedAt').below(timestamp).delete();
    },
  };
}
