export const FEED_LINK_SELECTOR = [
  'link[rel="alternate"][type="application/rss+xml"]',
  'link[rel="alternate"][type="application/atom+xml"]',
  'link[rel="alternate"][type="application/feed+json"]',
].join(',');
