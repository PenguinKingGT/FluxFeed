import { describe, expect, it } from 'vitest';

import type {
  AddFeedInput,
  ParsedArticle,
  ParsedFeed,
  ServiceResult,
} from '@/lib/types';

describe('服务类型定义', () => {
  it('描述解析结果、服务入参和服务返回值', () => {
    const parsedFeed: ParsedFeed = {
      title: 'Example',
      description: '',
      siteUrl: 'https://example.com',
      iconUrl: '',
      articles: [],
    };

    const parsedArticle: ParsedArticle = {
      guid: 'guid-1',
      title: 'Article',
      summary: '',
      content: '',
      author: '',
      publishedAt: 1,
      url: 'https://example.com/a',
    };

    const input: AddFeedInput = {
      url: 'https://example.com/rss.xml',
      groupId: 'group-1',
      refreshInterval: 60,
    };

    const result: ServiceResult<ParsedFeed> = {
      success: true,
      data: parsedFeed,
    };

    expect(parsedArticle.guid).toBe('guid-1');
    expect(input.url).toContain('https://');
    expect(result.success).toBe(true);
  });
});
