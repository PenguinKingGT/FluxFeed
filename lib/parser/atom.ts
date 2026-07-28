import type { ParsedFeed } from '@/lib/types';
import { asArray, fallbackTitle, getRecord, parseDate, readText, xmlParser } from './parser-utils';

function pickLink(linkValue: unknown): string {
  const links = asArray(linkValue).map(getRecord);
  const alternate = links.find((link) => readText(link['@_rel']) === 'alternate');
  const selected = alternate ?? links.find((link) => readText(link['@_href']));

  return readText(selected?.['@_href']);
}

export function parseAtomFeed(xml: string): ParsedFeed {
  const parsed = getRecord(xmlParser.parse(xml));
  const feed = getRecord(parsed.feed);
  const entries = asArray(feed.entry).map((entry) => {
    const record = getRecord(entry);
    const content = readText(record.content) || readText(record.summary);
    const url = pickLink(record.link);

    return {
      guid: readText(record.id) || url,
      title: fallbackTitle(record.title, content),
      summary: readText(record.summary),
      content,
      author: readText(getRecord(record.author).name),
      publishedAt: parseDate(record.published || record.updated),
      url,
    };
  });

  return {
    title: readText(feed.title),
    description: readText(feed.subtitle),
    siteUrl: pickLink(feed.link),
    iconUrl: readText(feed.icon),
    articles: entries,
  };
}
