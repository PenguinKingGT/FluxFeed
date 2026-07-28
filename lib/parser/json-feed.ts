import type { ParsedFeed } from '@/lib/types';
import { asArray, fallbackTitle, getRecord, parseDate, readText } from './parser-utils';

export function parseJsonFeed(input: string): ParsedFeed {
  const feed = getRecord(JSON.parse(input));
  const articles = asArray(feed.items).map((item) => {
    const record = getRecord(item);
    const content = readText(record.content_html) || readText(record.summary);
    const url = readText(record.url);

    return {
      guid: readText(record.id) || url,
      title: fallbackTitle(record.title, content),
      summary: readText(record.summary),
      content,
      author: readText(getRecord(record.author).name),
      publishedAt: parseDate(record.date_published || record.date_modified),
      url,
    };
  });

  return {
    title: readText(feed.title),
    description: readText(feed.description),
    siteUrl: readText(feed.home_page_url),
    iconUrl: readText(feed.icon),
    articles,
  };
}
