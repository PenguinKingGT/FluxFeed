import { useMemo, useState } from 'react';
import { FileText, FolderOpen, HelpCircle, Inbox, Newspaper, Plus, Settings, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import fluxFeedIcon from '@/assets/flux-feed.svg';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Feed, Group, MessageResponse, TreeNodeMove } from '@/lib/types';
import { openSupportPage } from './reader-runtime';
import { AddFeedModal } from './AddFeedModal';
import { CreateGroupModal } from './CreateGroupModal';
import { DeleteTreeNodeModal } from './DeleteTreeNodeModal';
import { FolderTree, type ReaderTreeNode } from './FolderTree';

export type ReaderView = 'inbox' | 'starred' | 'all' | 'digest' | 'folder' | 'feed' | 'settings';

interface SidebarProps {
  currentView: ReaderView;
  activeFeedId?: string;
  feeds: Feed[];
  groups: Group[];
  unreadCount: number;
  addFeed: (url: string, groupId?: string) => Promise<MessageResponse>;
  loadFeeds: () => Promise<void>;
  createGroup: (name: string, parentId?: string) => Promise<MessageResponse>;
  deleteGroup: (groupId: string) => Promise<MessageResponse>;
  removeFeed: (feedId: string) => Promise<MessageResponse>;
  moveTreeNode: (move: TreeNodeMove) => Promise<MessageResponse>;
  onNavigate?: () => void;
}

const navItems = [
  { id: 'inbox' as const, labelKey: 'navigation.inbox', path: '/inbox', icon: Inbox },
  { id: 'starred' as const, labelKey: 'navigation.starred', path: '/starred', icon: Star },
  { id: 'all' as const, labelKey: 'navigation.allArticles', path: '/all', icon: FileText },
  { id: 'digest' as const, labelKey: 'navigation.dailyDigest', path: '/digest', icon: Newspaper },
];

export function Sidebar({
  currentView,
  activeFeedId,
  feeds,
  groups,
  unreadCount,
  addFeed,
  loadFeeds,
  createGroup,
  deleteGroup,
  removeFeed,
  moveTreeNode,
  onNavigate,
}: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [groupParentId, setGroupParentId] = useState<string | undefined>();
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isRailFoldersOpen, setIsRailFoldersOpen] = useState(false);
  const [deleteNode, setDeleteNode] = useState<ReaderTreeNode | undefined>();
  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);

  function openCreateGroup(parentId?: string) {
    setIsRailFoldersOpen(false);
    setGroupParentId(parentId);
    setIsGroupOpen(true);
  }

  function navigateTo(path: string) {
    setIsRailFoldersOpen(false);
    navigate(path);
    onNavigate?.();
  }

  return (
    <aside data-testid="reader-sidebar" className="reader-sidebar sticky top-0 left-0 z-40 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/95 py-5 text-sidebar-foreground backdrop-blur-xl">
      <div className="mb-7 px-4">
        <div className="reader-sidebar-brand flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 rounded-xl bg-secondary/15 blur-md" />
            <img alt="FluxFeed" className="relative size-10 rounded-[11px] ring-1 ring-sidebar-border" src={fluxFeedIcon} />
          </div>
          <div className="reader-sidebar-copy min-w-0">
            <h1 className="font-serif text-[23px] leading-7 font-semibold tracking-[-0.035em]">FluxFeed</h1>
            <p className="truncate text-[10px] leading-4 font-semibold tracking-[0.12em] text-muted-foreground uppercase">{t('app.subtitle')}</p>
          </div>
        </div>
      </div>
      <nav aria-label="Primary" className="reader-scrollbar flex-1 overflow-y-auto px-2">
        <div className="mb-7 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                aria-label={t(item.labelKey)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'reader-sidebar-nav-button interactive-row relative flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60',
                  isActive
                    ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-[inset_0_1px_rgb(255_255_255/20%)] before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:bg-secondary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
                title={t(item.labelKey)}
                onClick={() => navigateTo(item.path)}
              >
                <span className="reader-sidebar-nav-label flex items-center gap-3">
                  <Icon className={cn('size-4', isActive && item.id === 'starred' ? 'fill-current' : undefined)} strokeWidth={1.8} />
                  <span className="reader-sidebar-item-text">{t(item.labelKey)}</span>
                </span>
                {item.id === 'inbox' && unreadCount > 0 ? (
                  <span className="reader-sidebar-count min-w-5 rounded-md bg-primary px-1.5 py-0.5 text-center text-[10px] text-primary-foreground tabular-nums">{unreadCount}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="reader-sidebar-rail-folders mb-6">
          <Popover open={isRailFoldersOpen} onOpenChange={setIsRailFoldersOpen}>
            <PopoverTrigger asChild>
              <Button aria-label={t('navigation.browseFolders')} title={t('navigation.browseFolders')} className="w-full rounded-lg text-muted-foreground" variant="ghost" size="icon-lg">
                <FolderOpen />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" side="right" sideOffset={10} className="reader-scrollbar max-h-[72vh] overflow-y-auto rounded-xl p-2">
              <div className="mb-2 flex items-center justify-between px-2 py-1">
                <p className="text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">{t('navigation.folders')}</p>
                <Button aria-label={t('tree.createFolder')} title={t('tree.createFolder')} variant="ghost" size="icon-sm" onClick={() => openCreateGroup()}>
                  <Plus />
                </Button>
              </div>
              <FolderTree
                feeds={feeds}
                groups={groups}
                activeFeedId={currentView === 'feed' ? activeFeedId : undefined}
                createGroup={openCreateGroup}
                deleteNode={setDeleteNode}
                moveNode={async (move) => {
                  const response = await moveTreeNode(move);
                  if (response.success) await loadFeeds();
                  return response;
                }}
                openFeed={(feedId) => navigateTo(`/feed/${encodeURIComponent(feedId)}`)}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="reader-sidebar-folders mb-6">
          <div className="mb-2 flex items-center justify-between px-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            <span>{t('navigation.folders')}</span>
            <button aria-label={t('tree.createFolder')} className="rounded-md p-1.5 text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60" onClick={() => openCreateGroup()}>
              <Plus className="size-3.5" strokeWidth={2} />
            </button>
          </div>
          <FolderTree
            feeds={feeds}
            groups={groups}
            activeFeedId={currentView === 'feed' ? activeFeedId : undefined}
            createGroup={openCreateGroup}
            deleteNode={setDeleteNode}
            moveNode={async (move) => {
              const response = await moveTreeNode(move);
              if (response.success) await loadFeeds();
              return response;
            }}
            openFeed={(feedId) => navigateTo(`/feed/${encodeURIComponent(feedId)}`)}
          />
        </div>
      </nav>
      <div className="mt-auto border-t border-sidebar-border px-3 pt-3">
        <Button aria-label={t('navigation.addFeed')} title={t('navigation.addFeed')} className="reader-sidebar-add mb-3 w-full rounded-lg" size="lg" onClick={() => setIsAddOpen(true)}>
          <Plus data-icon="inline-start" />
          <span className="reader-sidebar-footer-label">{t('navigation.addFeed')}</span>
        </Button>
        <button
          aria-label={t('navigation.settings')}
          aria-current={currentView === 'settings' ? 'page' : undefined}
          className={cn(
            'interactive-row relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60',
            currentView === 'settings'
              ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:bg-secondary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
          title={t('navigation.settings')}
          onClick={() => navigateTo('/settings')}
        >
          <Settings className="size-4" strokeWidth={1.8} />
          <span className="reader-sidebar-footer-label">{t('navigation.settings')}</span>
        </button>
        <button aria-label={t('navigation.support')} title={t('navigation.support')} className="interactive-row flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60" onClick={() => void openSupportPage()}>
          <HelpCircle className="size-4" strokeWidth={1.8} />
          <span className="reader-sidebar-footer-label">{t('navigation.support')}</span>
        </button>
      </div>
      <AddFeedModal open={isAddOpen} groups={groups} onOpenChange={setIsAddOpen} addFeed={addFeed} loadFeeds={loadFeeds} />
      <CreateGroupModal
        open={isGroupOpen}
        parentName={groupParentId ? groupById.get(groupParentId)?.name : undefined}
        onOpenChange={setIsGroupOpen}
        createGroup={(name) => createGroup(name, groupParentId)}
      />
      <DeleteTreeNodeModal
        open={Boolean(deleteNode)}
        node={deleteNode}
        onOpenChange={(open) => {
          if (!open) setDeleteNode(undefined);
        }}
        onDelete={async (node) => {
          const response = node.type === 'folder'
            ? await deleteGroup(node.rawId)
            : await removeFeed(node.rawId);
          if (response.success) {
            await loadFeeds();
            if (node.type === 'feed' && activeFeedId === node.rawId) navigateTo('/inbox');
          }
          return response;
        }}
      />
    </aside>
  );
}
