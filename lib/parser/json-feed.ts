import type { ParsedFeed } from '@/lib/types';
import { plainTextToHtml } from './text-content';
import { asArray, fallbackTitle, getRecord, parseDate, readText } from './parser-utils';

/** Prefers HTML, otherwise encodes text-only bodies for safe HTML-based reading. */
export function parseJsonFeed(input: string): ParsedFeed {
  const feed = getRecord(JSON.parse(input));
  const articles = asArray(feed.items).map((item) => {
    const record = getRecord(item);
    const html = readText(record.content_html);
    const text = (typeof record.content_text === 'string' ? record.content_text : '')
      || readText(record.summary);
    const content = html || plainTextToHtml(text);
    // A text-derived title is displayed as text; do not strip literal angle brackets or expose HTML entities.
    const title = html
      ? fallbackTitle(record.title, html)
      : readText(record.title) || text.replace(/\s+/g, ' ').trim().slice(0, 50);
    const url = readText(record.url);

    return {
      guid: readText(record.id) || url,
      title,
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
