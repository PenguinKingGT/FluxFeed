export interface DetectedFeed {
  url: string;
  title: string;
  type?: string;
}

export const COMMON_FEED_PATHS = [
  '/feed',
  '/feed.xml',
  '/rss',
  '/rss.xml',
  '/atom.xml',
  '/index.xml',
  '/feed/rss',
  '/feeds/posts/default',
  '/rss/index.rss',
];

const FEED_TYPES = new Set([
  'application/rss+xml',
  'application/atom+xml',
  'application/feed+json',
  'application/json',
]);

const RSS_KEYWORDS = /\brss\b|\bfeed\b|\batom\b/i;

function toAbsoluteUrl(url: string, baseUrl: string): string {
  return new URL(url, baseUrl).href;
}

export function discoverFromLinkTags(doc: Document, baseUrl: string): DetectedFeed[] {
  return Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel~="alternate"][href]'))
    .filter((link) => FEED_TYPES.has(link.type.toLowerCase()))
    .map((link) => ({
      url: toAbsoluteUrl(link.getAttribute('href') ?? link.href, baseUrl),
      title: link.title || doc.title,
      type: link.type,
    }));
}

export function discoverFromAnchors(doc: Document, baseUrl: string): DetectedFeed[] {
  return Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .filter((anchor) => RSS_KEYWORDS.test(anchor.textContent ?? '') || RSS_KEYWORDS.test(anchor.href))
    .slice(0, 3)
    .map((anchor) => ({
      url: toAbsoluteUrl(anchor.getAttribute('href') ?? anchor.href, baseUrl),
      title: anchor.textContent?.trim() || anchor.href,
    }));
}

export function guessCommonFeedUrls(baseUrl: string): string[] {
  const origin = new URL(baseUrl).origin;

  return COMMON_FEED_PATHS.map((path) => `${origin}${path}`);
}

export function discoverFeeds(doc: Document, baseUrl: string): DetectedFeed[] {
  const fromLinks = discoverFromLinkTags(doc, baseUrl);

  if (fromLinks.length > 0) {
    return fromLinks;
  }
  return discoverFromAnchors(doc, baseUrl);
}
