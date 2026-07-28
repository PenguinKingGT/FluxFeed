import { afterEach, describe, expect, it } from 'vitest';

import { FluxFeedDatabase } from '@/lib/db/database';
import { resetDatabase } from '@/lib/db/database-service';
import { createStorageService } from '@/lib/db/storage-service';
import type { Article, Feed, Group } from '@/lib/types';

const createFeed = (overrides: Partial<Feed> = {}): Feed => ({
  id: 'feed-1',
  url: 'https://example.com/rss.xml',
  title: 'Example',
  description: '',
  siteUrl: 'https://example.com',
  iconUrl: '',
  refreshInterval: 60,
  errorCount: 0,
  createdAt: 1,
  ...overrides,
});

const createArticle = (overrides: Partial<Article> = {}): Article => ({
  id: 'article-1',
  feedId: 'feed-1',
  guid: 'guid-1',
  title: 'Article',
  url: 'https://example.com/a',
  author: '',
  summary: '',
  content: '',
  publishedAt: 1,
  isRead: false,
  isStarred: false,
  tags: [],
  fetchedAt: 1,
  ...overrides,
});

const createGroup = (overrides: Partial<Group> = {}): Group => ({
  id: 'group-1',
  name: 'Technology',
  order: 1,
  createdAt: 1,
  ...overrides,
});

describe('storage service', () => {
  const database = new FluxFeedDatabase();
  const storageService = createStorageService(database);

  afterEach(async () => {
    await resetDatabase(database);
  });

  it('creates, updates, lists, and removes feeds', async () => {
    await storageService.saveFeed(createFeed());
    await storageService.updateFeed('feed-1', { title: 'Updated' });

    expect(await storageService.getFeed('feed-1')).toMatchObject({
      id: 'feed-1',
      title: 'Updated',
    });
    expect(await storageService.getFeeds()).toMatchObject([
      { id: 'feed-1', title: 'Updated' },
    ]);

    await storageService.removeFeed('feed-1');

    expect(await storageService.getFeeds()).toEqual([]);
  });

  it('creates groups and prevents nesting deeper than two levels', async () => {
    await storageService.saveGroup(createGroup());
    await storageService.saveGroup(createGroup({ id: 'group-2', name: 'Frontend', parentId: 'group-1', order: 2, createdAt: 2 }));

    expect(await storageService.getGroups()).toMatchObject([
      { id: 'group-1', name: 'Technology' },
      { id: 'group-2', name: 'Frontend', parentId: 'group-1' },
    ]);

    await expect(storageService.saveGroup(createGroup({ id: 'group-3', parentId: 'group-2' }))).rejects.toThrow('Groups can only be nested two levels deep');
  });

  it('recursively deletes a root group with child groups, feeds, and articles', async () => {
    await storageService.saveGroup(createGroup());
    await storageService.saveGroup(createGroup({ id: 'group-2', name: 'Frontend', parentId: 'group-1', order: 2, createdAt: 2 }));
    await storageService.saveFeed(createFeed({ id: 'feed-1', groupId: 'group-1' }));
    await storageService.saveFeed(createFeed({ id: 'feed-2', url: 'https://example.com/2.xml', groupId: 'group-2' }));
    await storageService.saveArticles([
      createArticle({ id: 'article-1', feedId: 'feed-1' }),
      createArticle({ id: 'article-2', guid: 'guid-2', feedId: 'feed-2' }),
    ]);

    await storageService.removeGroup('group-1');

    expect(await storageService.getGroups()).toEqual([]);
    expect(await storageService.getFeeds()).toEqual([]);
    expect(await storageService.getArticles()).toEqual([]);
  });

  it('deletes only the selected child group subtree', async () => {
    await storageService.saveGroup(createGroup());
    await storageService.saveGroup(createGroup({ id: 'group-2', name: 'Frontend', parentId: 'group-1', order: 2, createdAt: 2 }));
    await storageService.saveFeed(createFeed({ groupId: 'group-2' }));
    await storageService.saveArticles([createArticle()]);

    await storageService.removeGroup('group-2');

    expect(await storageService.getGroups()).toMatchObject([
      { id: 'group-1' },
    ]);
    expect(await storageService.getFeeds()).toEqual([]);
    expect(await storageService.getArticles()).toEqual([]);
  });

  it('moves and reorders folders and feeds while keeping folders before feeds', async () => {
    await storageService.saveGroup(createGroup({ id: 'group-1', order: 10 }));
    await storageService.saveGroup(createGroup({ id: 'group-2', name: 'Design', order: 20 }));
    await storageService.saveFeed(createFeed({ id: 'feed-1', order: 10 }));
    await storageService.saveFeed(createFeed({ id: 'feed-2', url: 'https://example.com/2.xml', order: 20 }));

    await storageService.moveTreeNode({ nodeType: 'folder', nodeId: 'group-2', parentId: 'group-1', index: 0 });
    await storageService.moveTreeNode({ nodeType: 'feed', nodeId: 'feed-2', parentId: 'group-1', index: 0 });

    const groups = await storageService.getGroups();
    const feeds = await storageService.getFeeds();

    expect(groups.find((group) => group.id === 'group-1')).not.toHaveProperty('parentId');
    expect(groups.find((group) => group.id === 'group-2')).toMatchObject({ parentId: 'group-1', order: 0 });
    expect(feeds.find((feed) => feed.id === 'feed-2')).toMatchObject({ groupId: 'group-1', order: 0 });
    expect(feeds.find((feed) => feed.id === 'feed-1')).toMatchObject({ order: 10 });
  });

  it('rejects moving a folder below the second level', async () => {
    await storageService.saveGroup(createGroup({ id: 'group-1' }));
    await storageService.saveGroup(createGroup({ id: 'group-2', parentId: 'group-1' }));
    await storageService.saveGroup(createGroup({ id: 'group-3', name: 'Design', order: 3, createdAt: 3 }));

    await expect(
      storageService.moveTreeNode({ nodeType: 'folder', nodeId: 'group-3', parentId: 'group-2', index: 0 }),
    ).rejects.toThrow('Groups can only be nested two levels deep');
  });

  it('rejects moving a folder into itself', async () => {
    await storageService.saveGroup(createGroup());

    await expect(
      storageService.moveTreeNode({ nodeType: 'folder', nodeId: 'group-1', parentId: 'group-1', index: 0 }),
    ).rejects.toThrow('A folder cannot contain itself');
  });

  it('saves and filters articles with pagination', async () => {
    await storageService.saveGroup(createGroup());
    await storageService.saveGroup(createGroup({ id: 'group-2', name: 'Frontend', parentId: 'group-1', order: 2, createdAt: 2 }));
    await storageService.saveFeed(createFeed({ id: 'feed-1', groupId: 'group-1' }));
    await storageService.saveFeed(createFeed({ id: 'feed-2', url: 'https://example.com/2.xml', groupId: 'group-2' }));
    await storageService.saveArticles([
      createArticle({ id: 'article-1', publishedAt: 1 }),
      createArticle({ id: 'article-2', guid: 'guid-2', publishedAt: 2, isRead: true }),
      createArticle({ id: 'article-3', guid: 'guid-3', feedId: 'feed-2', publishedAt: 3, isStarred: true }),
    ]);

    expect(await storageService.getArticles({ onlyUnread: true })).toHaveLength(2);
    expect(await storageService.getArticles({ onlyStarred: true })).toMatchObject([
      { id: 'article-3' },
    ]);
    expect(await storageService.getArticles({ feedId: 'feed-1', limit: 1, offset: 1 })).toMatchObject([
      { id: 'article-1' },
    ]);
    expect(await storageService.getArticles({ groupId: 'group-1' })).toMatchObject([
      { id: 'article-3' },
      { id: 'article-2' },
      { id: 'article-1' },
    ]);
  });

  it('updates articles individually and in bulk', async () => {
    await storageService.saveArticles([
      createArticle({ id: 'article-1' }),
      createArticle({ id: 'article-2', guid: 'guid-2' }),
    ]);

    await storageService.updateArticle('article-1', { isRead: true });
    await storageService.bulkUpdateArticles(['article-1', 'article-2'], { isStarred: true });

    expect(await storageService.getArticles({ onlyStarred: true })).toMatchObject([
      { id: 'article-2', isStarred: true },
      { id: 'article-1', isRead: true, isStarred: true },
    ]);
  });

  it('counts unread articles and removes articles by feed', async () => {
    await storageService.saveArticles([
      createArticle({ id: 'article-1', feedId: 'feed-1' }),
      createArticle({ id: 'article-2', guid: 'guid-2', feedId: 'feed-1', isRead: true }),
      createArticle({ id: 'article-3', guid: 'guid-3', feedId: 'feed-2' }),
    ]);

    expect(await storageService.getUnreadCount()).toBe(2);

    await storageService.removeArticlesByFeed('feed-1');

    expect(await storageService.getArticles()).toMatchObject([
      { id: 'article-3', feedId: 'feed-2' },
    ]);
  });

  it('prunes old read articles while keeping unread and starred articles', async () => {
    const now = Date.now();

    await storageService.saveArticles([
      createArticle({ id: 'old-read', fetchedAt: now - 10 * 24 * 60 * 60 * 1000, isRead: true }),
      createArticle({ id: 'old-unread', guid: 'guid-2', fetchedAt: now - 10 * 24 * 60 * 60 * 1000 }),
      createArticle({ id: 'old-starred', guid: 'guid-3', fetchedAt: now - 10 * 24 * 60 * 60 * 1000, isRead: true, isStarred: true }),
      createArticle({ id: 'new-read', guid: 'guid-4', fetchedAt: now, isRead: true }),
    ]);

    await storageService.pruneOldArticles(7);

    expect((await storageService.getArticles()).map((article: Article) => article.id).sort()).toEqual([
      'new-read',
      'old-starred',
      'old-unread',
    ]);
  });

  it('keeps all articles when retention is set to forever', async () => {
    await storageService.saveArticles([
      createArticle({ id: 'read', isRead: true }),
      createArticle({ id: 'unread', guid: 'guid-2' }),
    ]);

    await storageService.pruneOldArticles(0);

    expect(await storageService.getArticles()).toHaveLength(2);
  });

  it('limits each feed by removing its oldest read unstarred articles', async () => {
    await storageService.saveFeed(createFeed());
    await storageService.saveArticles([
      createArticle({ id: 'old-read', publishedAt: 1, isRead: true }),
      createArticle({ id: 'new-read', guid: 'guid-2', publishedAt: 2, isRead: true }),
      createArticle({ id: 'unread', guid: 'guid-3', publishedAt: 3 }),
      createArticle({ id: 'starred', guid: 'guid-4', publishedAt: 4, isRead: true, isStarred: true }),
    ]);

    await storageService.pruneExcessArticles(3);

    expect((await storageService.getArticles()).map((article) => article.id)).toEqual([
      'starred',
      'unread',
      'new-read',
    ]);
  });

  it('reads defaults and saves partial settings', async () => {
    expect(await storageService.getSettings()).toMatchObject({
      id: 'global',
      refreshInterval: 60,
    });

    await storageService.saveSettings({
      refreshInterval: 15,
      showUnreadOnly: true,
    });

    expect(await storageService.getSettings()).toMatchObject({
      id: 'global',
      refreshInterval: 15,
      showUnreadOnly: true,
    });
  });
});
