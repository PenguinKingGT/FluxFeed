import { ChevronDown, ChevronRight, Folder, Plus, Trash2 } from 'lucide-react';
import { Tree, type MoveHandler, type NodeRendererProps, type RowRendererProps } from 'react-arborist';
import { useTranslation } from 'react-i18next';
import type { Feed, Group, MessageResponse, TreeNodeMove } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Favicon } from '@/components/popup/Favicon';

export interface ReaderTreeNode {
  id: string;
  rawId: string;
  name: string;
  type: 'folder' | 'feed';
  group?: Group;
  feed?: Feed;
  children?: ReaderTreeNode[];
}

interface FolderTreeProps {
  feeds: Feed[];
  groups: Group[];
  activeFeedId?: string;
  createGroup: (parentId: string) => void;
  deleteNode: (node: ReaderTreeNode) => void;
  moveNode: (move: TreeNodeMove) => Promise<MessageResponse>;
  openFeed: (feedId: string) => void;
}

export const TREE_ROW_HEIGHT = 30;

function feedOrder(feed: Feed): number {
  return feed.order ?? feed.createdAt;
}

export function buildReaderTree(groups: Group[], feeds: Feed[]): ReaderTreeNode[] {
  const folderNodes = new Map<string, ReaderTreeNode>();

  for (const group of groups) {
    folderNodes.set(group.id, {
      id: `folder:${group.id}`,
      rawId: group.id,
      name: group.name,
      type: 'folder',
      group,
      children: [],
    });
  }

  const roots: ReaderTreeNode[] = [];
  for (const group of groups) {
    const node = folderNodes.get(group.id)!;
    const parent = group.parentId ? folderNodes.get(group.parentId) : undefined;
    if (parent) {
      parent.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  const ungroupedFeeds: ReaderTreeNode[] = [];
  for (const feed of feeds) {
    const node: ReaderTreeNode = {
      id: `feed:${feed.id}`,
      rawId: feed.id,
      name: feed.title,
      type: 'feed',
      feed,
    };
    const parent = feed.groupId ? folderNodes.get(feed.groupId) : undefined;
    if (parent) {
      parent.children!.push(node);
    } else {
      ungroupedFeeds.push(node);
    }
  }

  function sortChildren(node: ReaderTreeNode) {
    node.children?.sort((left, right) => {
      if (left.type !== right.type) return left.type === 'folder' ? -1 : 1;
      if (left.type === 'folder') return left.group!.order - right.group!.order;
      return feedOrder(left.feed!) - feedOrder(right.feed!);
    });
    node.children?.filter((child) => child.type === 'folder').forEach(sortChildren);
  }

  roots.sort((left, right) => left.group!.order - right.group!.order);
  roots.forEach(sortChildren);
  ungroupedFeeds.sort((left, right) => feedOrder(left.feed!) - feedOrder(right.feed!));
  return [...roots, ...ungroupedFeeds];
}

function countNodes(nodes: ReaderTreeNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children ?? []), 0);
}

export function getTreeHeight(nodes: ReaderTreeNode[]): number {
  return Math.max(TREE_ROW_HEIGHT, countNodes(nodes) * TREE_ROW_HEIGHT);
}

function TreeRow({ attrs, innerRef, children }: RowRendererProps<ReaderTreeNode>) {
  return (
    <div
      {...attrs}
      ref={innerRef}
      className="overflow-hidden"
      style={{
        ...attrs.style,
        width: '100%',
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

export function FolderTree({ feeds, groups, activeFeedId, createGroup, deleteNode, moveNode, openFeed }: FolderTreeProps) {
  const { t } = useTranslation();
  const data = buildReaderTree(groups, feeds);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const height = getTreeHeight(data);

  const handleMove: MoveHandler<ReaderTreeNode> = async ({ dragNodes, parentNode, index }) => {
    const dragged = dragNodes[0]?.data;
    if (!dragged) return;

    const parentId = parentNode?.data.type === 'folder' ? parentNode.data.rawId : null;
    const siblings = parentNode?.data.children ?? data;
    const typeIndex = siblings
      .slice(0, index)
      .filter((node) => node.type === dragged.type && node.id !== dragged.id)
      .length;

    await moveNode({
      nodeType: dragged.type,
      nodeId: dragged.rawId,
      parentId,
      index: typeIndex,
    });
  };

  function Node({ node, style, dragHandle }: NodeRendererProps<ReaderTreeNode>) {
    const dataNode = node.data;
    const isFolder = dataNode.type === 'folder';
    const isActive = !isFolder && activeFeedId === dataNode.rawId;
    const canCreateChild = isFolder && !dataNode.group?.parentId;
    const levelIndent = typeof style.paddingLeft === 'number'
      ? style.paddingLeft
      : Number.parseFloat(String(style.paddingLeft ?? 0));

    return (
      <div
        ref={dragHandle}
        data-testid={`tree-node-${dataNode.id}`}
        style={{
          ...style,
          paddingLeft: levelIndent + 16,
        }}
        className={cn(
          'group/tree-node flex cursor-pointer items-center gap-1 pr-2 text-sm text-muted-foreground',
          isActive ? 'bg-sidebar-accent font-bold text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          node.willReceiveDrop && 'bg-accent',
        )}
        onClick={() => {
          if (isFolder) {
            node.toggle();
          } else {
            openFeed(dataNode.rawId);
          }
        }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {isFolder ? (
            <>
              {node.isOpen ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
              <Folder className="size-4 shrink-0" />
            </>
          ) : (
            <>
              <span className="size-3.5 shrink-0" />
              <Favicon url={dataNode.feed?.siteUrl ?? dataNode.feed?.url ?? dataNode.id} title={dataNode.name} imageUrl={dataNode.feed?.iconUrl} size={14} />
            </>
          )}
          <span className="truncate">{dataNode.name}</span>
        </span>
        <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/tree-node:opacity-100">
          {canCreateChild ? (
            <button
              aria-label={t('tree.createSubfolder', { name: dataNode.name })}
              className="rounded p-1 hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation();
                createGroup(dataNode.rawId);
              }}
            >
              <Plus className="size-3.5" />
            </button>
          ) : null}
          <button
            aria-label={t(isFolder ? 'tree.deleteFolder' : 'tree.deleteFeed', { name: dataNode.name })}
            className="rounded p-1 hover:bg-destructive/10 hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              deleteNode(dataNode);
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
        </span>
      </div>
    );
  }

  return (
    <Tree
      aria-label={t('tree.label')}
      data={data}
      width="100%"
      height={height}
      rowHeight={TREE_ROW_HEIGHT}
      renderRow={TreeRow}
      indent={16}
      openByDefault
      disableMultiSelection
      selection={activeFeedId ? `feed:${activeFeedId}` : undefined}
      onMove={handleMove}
      onActivate={(node) => {
        if (node.data.type === 'feed') openFeed(node.data.rawId);
      }}
      disableDrop={({ parentNode, dragNodes }) => {
        if (parentNode.isRoot) return false;
        if (parentNode.data.type === 'feed') return true;
        const dragged = dragNodes[0]?.data;
        if (!dragged || dragged.type === 'feed') return false;
        const targetGroup = groupById.get(parentNode.data.rawId);
        if (targetGroup?.parentId) return true;
        return Boolean(dragged.children?.some((child) => child.type === 'folder'));
      }}
    >
      {Node}
    </Tree>
  );
}
