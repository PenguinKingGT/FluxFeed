import { describe, expect, it } from 'vitest';

import { FeedParseError } from '@/lib/types';
import type { FeedFormat, ParsedArticle, ParsedFeed } from '@/lib/types';

describe('解析器类型', () => {
  it('描述统一 Feed 和文章结构', () => {
    const format: FeedFormat = 'rss';
    const article: ParsedArticle = {
      guid: 'guid-1',
      title: 'Article',
      summary: 'Summary',
      content: '<p>Content</p>',
      author: 'Author',
      publishedAt: 1,
      url: 'https://example.com/a',
    };
    const feed: ParsedFeed = {
      title: 'Example',
      description: 'Desc',
      siteUrl: 'https://example.com',
      iconUrl: 'https://example.com/icon.png',
      articles: [article],
    };

    expect(format).toBe('rss');
    expect(feed.articles[0]?.guid).toBe('guid-1');
  });

  it('提供解析错误类型', () => {
    expect(new FeedParseError('Unknown feed format')).toBeInstanceOf(Error);
  });
});
