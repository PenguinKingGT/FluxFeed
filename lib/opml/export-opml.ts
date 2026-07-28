import type { Feed, Group } from '@/lib/types';

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function feedOutline(feed: Feed, indent: string): string {
  const title = escapeAttribute(feed.title);
  const xmlUrl = escapeAttribute(feed.url);
  const htmlUrl = escapeAttribute(feed.siteUrl);
  return `${indent}<outline text="${title}" title="${title}" type="rss" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}" />`;
}

export function generateOPML(feeds: Feed[], groups: Group[] = []): string {
  const lines: string[] = [];
  const rootFeeds = feeds.filter((feed) => !feed.groupId);
  lines.push(...rootFeeds.map((feed) => feedOutline(feed, '    ')));

  const appendGroup = (group: Group, indent: string) => {
    const label = escapeAttribute(group.name);
    lines.push(`${indent}<outline text="${label}" title="${label}">`);
    lines.push(
      ...feeds
        .filter((feed) => feed.groupId === group.id)
        .map((feed) => feedOutline(feed, `${indent}  `)),
    );
    for (const child of groups
      .filter((item) => item.parentId === group.id)
      .sort((left, right) => left.order - right.order)) {
      appendGroup(child, `${indent}  `);
    }
    lines.push(`${indent}</outline>`);
  };

  for (const group of groups
    .filter((item) => !item.parentId)
    .sort((left, right) => left.order - right.order)) {
    appendGroup(group, '    ');
  }

  const outlines = lines.join('\n');

  return [
    '<?xml version="1.0"?>',
    '<opml version="2.0">',
    '  <head>',
    '    <title>FluxFeed Subscriptions</title>',
    '  </head>',
    '  <body>',
    outlines,
    '  </body>',
    '</opml>',
  ].join('\n');
}

export function exportOpml(feeds: Feed[], groups: Group[] = []): string {
  return generateOPML(feeds, groups);
}
