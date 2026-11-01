import type { ParsedFeed } from '@/lib/types';
import { fallbackTitle, getRecord, parseDate, readText } from './parser-utils';
import { atomChildren, atomContent, atomText, parseAtomNodes, type AtomNode } from './atom-content';

/** Selects the human-readable link while retaining the legacy first-link fallback. */
function pickLink(children: AtomNode[]): string {
  const links = children.filter((node) => 'link' in node).map((node) => getRecord(node[':@']));
  const alternate = links.find((link) => readText(link['@_rel']) === 'alternate');
  const selected = alternate ?? links.find((link) => readText(link['@_href']));
  return readText(selected?.['@_href']);
}

/** Parses ordered Atom constructs without a browser DOM; rendered bodies still require sanitization. */
export function parseAtomFeed(xml: string): ParsedFeed {
  const parsed = parseAtomNodes(xml);
  const feed = atomChildren(parsed.find((node) => 'feed' in node), 'feed');
  const entries = feed.filter((node) => 'entry' in node).map((node) => atomChildren(node, 'entry'));
  const articles = entries.map((entry) => {
    const summary = atomContent(entry, 'summary');
    const content = atomContent(entry, 'content') || summary;
    const url = pickLink(entry);
    const author = atomChildren(entry.find((node) => 'author' in node), 'author');
    return {
      guid: atomText(entry, 'id') || url,
      title: fallbackTitle(atomText(entry, 'title'), content),
      summary,
      content,
      author: atomText(author, 'name'),
      publishedAt: parseDate(atomText(entry, 'published') || atomText(entry, 'updated')),
      url,
    };
  });

  return {
    title: atomText(feed, 'title'),
    description: atomText(feed, 'subtitle'),
    siteUrl: pickLink(feed),
    iconUrl: atomText(feed, 'icon'),
    articles,
  };
}
