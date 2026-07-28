import { describe, expect, it } from 'vitest';
import type { Feed, Group } from '@/lib/types';
import { buildReaderTree, getTreeHeight, TREE_ROW_HEIGHT } from '@/components/reader/FolderTree';

const groups: Group[] = [
  { id: 'group-2', name: 'Design', order: 20, createdAt: 2 },
  { id: 'group-1', name: 'Technology', order: 10, createdAt: 1 },
  { id: 'group-3', name: 'Frontend', parentId: 'group-1', order: 5, createdAt: 3 },
];

const feeds: Feed[] = [
  {
    id: 'feed-2',
    url: 'https://example.com/2.xml',
    title: 'Second',
    description: '',
    siteUrl: '',
    iconUrl: '',
    groupId: 'group-1',
    order: 20,
    refreshInterval: 30,
    errorCount: 0,
    createdAt: 2,
  },
  {
    id: 'feed-1',
    url: 'https://example.com/1.xml',
    title: 'First',
    description: '',
    siteUrl: '',
    iconUrl: '',
    groupId: 'group-1',
    order: 10,
    refreshInterval: 30,
    errorCount: 0,
    createdAt: 1,
  },
];

describe('reader folder tree', () => {
  it('uses compact rows and expands to content height without an internal scroll cap', () => {
    const tree = buildReaderTree(groups, feeds);

    expect(TREE_ROW_HEIGHT).toBe(30);
    expect(getTreeHeight(tree)).toBe(150);
    expect(getTreeHeight([])).toBe(30);
  });

  it('sorts folders before feeds and preserves type-specific order', () => {
    const tree = buildReaderTree(groups, feeds);

    expect(tree.map((node) => node.rawId)).toEqual(['group-1', 'group-2']);
    expect(tree[0].children?.map((node) => node.rawId)).toEqual(['group-3', 'feed-1', 'feed-2']);
  });
});
