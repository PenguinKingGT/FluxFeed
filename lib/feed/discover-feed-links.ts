export interface DiscoveredFeedLink {
  title: string;
  url: string;
  type: 'rss' | 'atom' | 'json';
}

const FEED_TYPES = {
  'application/rss+xml': 'rss',
  'application/atom+xml': 'atom',
  'application/feed+json': 'json',
} as const;

export function discoverFeedLinks(html: string, baseUrl: string): DiscoveredFeedLink[] {
  const document = new DOMParser().parseFromString(html, 'text/html');

  return Array.from(document.querySelectorAll('link[rel~="alternate"][type][href]'))
    .map((element) => {
      const type = element.getAttribute('type')?.toLowerCase();
      const href = element.getAttribute('href');
      const feedType = type ? FEED_TYPES[type as keyof typeof FEED_TYPES] : undefined;

      if (!feedType || !href) {
        return undefined;
      }

      return {
        title: element.getAttribute('title') ?? '',
        url: new URL(href, baseUrl).href,
        type: feedType,
      };
    })
    .filter((link): link is DiscoveredFeedLink => Boolean(link));
}
