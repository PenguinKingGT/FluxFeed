import { describe, expect, it } from 'vitest';

import type { Article, Feed, Group, Settings } from '@/lib/types';

describe('核心实体类型', () => {
  it('允许创建符合数据库结构的实体', () => {
    const feed: Feed = {
      id: 'feed-1',
      url: 'https://example.com/rss.xml',
      title: 'Example',
      description: '',
      siteUrl: 'https://example.com',
      iconUrl: '',
      refreshInterval: 60,
      errorCount: 0,
      createdAt: 1,
    };

    const article: Article = {
      id: 'article-1',
      feedId: feed.id,
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
    };

    const group: Group = {
      id: 'group-1',
      name: '科技',
      order: 1,
      createdAt: 1,
    };

    const settings: Settings = {
      id: 'global',
      refreshInterval: 60,
      maxArticlesPerFeed: 200,
      retentionDays: 90,
      theme: 'system',
      colorTheme: 'quiet-signal',
      language: 'en',
      readingFont: 'system-serif',
      interfaceFont: 'system-sans',
      fontSize: 'medium',
      markReadOnOpen: false,
      showUnreadOnly: false,
      ai: {
        apiUrl: '',
        model: '',
        summaryLanguage: 'auto',
        summaryLength: 'standard',
        customInstructions: '',
        dailyDigestMaxArticles: 100,
        autoSummarizeOnOpen: false,
        autoSummarizeMinCharacters: 1000,
      },
    };

    expect(feed.id).toBe('feed-1');
    expect(article.feedId).toBe(feed.id);
    expect(group.name).toBe('科技');
    expect(settings.id).toBe('global');
  });
});
