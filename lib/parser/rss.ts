import type { ParsedFeed } from '@/lib/types';
import { asArray, fallbackTitle, getRecord, parseDate, readText, xmlParser } from './parser-utils';

export function parseRssFeed(xml: string): ParsedFeed {
  const parsed = getRecord(xmlParser.parse(xml));
  const rss = getRecord(parsed.rss);
  const channel = getRecord(rss.channel);
  const items = asArray(channel.item).map((item) => {
    const record = getRecord(item);
    const description = readText(record.description);
    const encodedContent = readText(record['content:encoded']);
    const content = encodedContent || description;
    const link = readText(record.link);

    return {
      guid: readText(record.guid) || link,
      title: fallbackTitle(record.title, content),
      summary: encodedContent ? description : '',
      content,
      author: readText(record.author) || readText(record['dc:creator']),
      publishedAt: parseDate(record.pubDate),
      url: link,
    };
  });

  return {
    title: readText(channel.title),
    description: readText(channel.description),
    siteUrl: readText(channel.link),
    iconUrl: readText(getRecord(channel.image).url),
    articles: items,
  };
}
