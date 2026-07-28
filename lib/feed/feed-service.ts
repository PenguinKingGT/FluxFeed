export function createFeedService() {
  return {
    ready: true,
  };
}

export { discoverFeedLinks } from './discover-feed-links';
export { fetchFeed } from './feed-fetcher';
export { validateFeedUrl } from './feed-validator';
