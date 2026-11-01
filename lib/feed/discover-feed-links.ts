import { Parser } from 'htmlparser2';

export interface DiscoveredFeedLink {
  title: string;
  url: string;
  type: 'rss' | 'atom' | 'json';
}

const FEED_TYPES: ReadonlyMap<string, DiscoveredFeedLink['type']> = new Map([
  ['application/rss+xml', 'rss'],
  ['application/atom+xml', 'atom'],
  ['application/feed+json', 'json'],
]);

/** Extracts HTTP(S) feed links in source order without requiring browser DOM APIs. */
export function discoverFeedLinks(html: string, baseUrl: string): DiscoveredFeedLink[] {
  const links: DiscoveredFeedLink[] = [];
  let templateDepth = 0;
  // Consume tag events only: no document tree, script execution, or external resource loading.
  const parser = new Parser({
    onopentag(name, attributes) {
      if (name === 'template') {
        templateDepth += 1;
      }
      if (templateDepth > 0 || name !== 'link') {
        return;
      }

      const relations = (attributes.rel ?? '').toLowerCase().split(/\s+/);
      const mimeType = (attributes.type ?? '').split(';', 1)[0].trim().toLowerCase();
      const feedType = FEED_TYPES.get(mimeType);
      const href = attributes.href?.trim();
      if (!relations.includes('alternate') || !feedType || !href) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, baseUrl);
      } catch {
        // A malformed candidate must not hide valid feed links later in the page.
        return;
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return;
      }

      links.push({
        title: attributes.title ?? '',
        url: url.href,
        type: feedType,
      });
    },
    onclosetag(name) {
      // Template contents are inert and were not traversed by the previous DOM query.
      if (name === 'template') {
        templateDepth -= 1;
      }
    },
  });
  parser.end(html);
  return links;
}
