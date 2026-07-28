import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { readReaderLayoutPreferences, writeReaderLayoutPreferences } from '@/lib/reader/layout-preferences';
import { useArticleStore, useFeedStore, useGroupStore, useSettingsStore } from '@/store';
import type { ArticleFilter } from '@/store/articleStore';
import { ArticlePanel } from './ArticlePanel';
import { ReadingPane } from './ReadingPane';
import { Sidebar, type ReaderView } from './Sidebar';
import { openArticleUrl } from './reader-runtime';

interface ReaderLayoutProps {
  view: ReaderView;
}

export function ReaderLayout({ view }: ReaderLayoutProps) {
  const { t } = useTranslation();
  const params = useParams();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(() => readReaderLayoutPreferences().focusMode);
  const articles = useArticleStore((state) => state.articles);
  const activeArticleId = useArticleStore((state) => state.activeArticleId);
  const unreadCount = useArticleStore((state) => state.unreadCount);
  const filter = useArticleStore((state) => state.filter);
  const isLoading = useArticleStore((state) => state.isLoading);
  const articleError = useArticleStore((state) => state.error);
  const loadArticles = useArticleStore((state) => state.loadArticles);
  const loadUnreadCount = useArticleStore((state) => state.loadUnreadCount);
  const setFilter = useArticleStore((state) => state.setFilter);
  const setActiveArticle = useArticleStore((state) => state.setActiveArticle);
  const markRead = useArticleStore((state) => state.markRead);
  const starArticle = useArticleStore((state) => state.starArticle);
  const goNext = useArticleStore((state) => state.goNext);
  const goPrev = useArticleStore((state) => state.goPrev);
  const summaryStatusByArticleId = useArticleStore((state) => state.summaryStatusByArticleId);
  const summaryStaleByArticleId = useArticleStore((state) => state.summaryStaleByArticleId);
  const summarizeArticle = useArticleStore((state) => state.summarizeArticle);
  const feeds = useFeedStore((state) => state.feeds);
  const addFeed = useFeedStore((state) => state.addFeed);
  const removeFeed = useFeedStore((state) => state.removeFeed);
  const loadFeeds = useFeedStore((state) => state.loadFeeds);
  const refreshFeed = useFeedStore((state) => state.refreshFeed);
  const groups = useGroupStore((state) => state.groups);
  const loadGroups = useGroupStore((state) => state.loadGroups);
  const createGroup = useGroupStore((state) => state.createGroup);
  const deleteGroup = useGroupStore((state) => state.deleteGroup);
  const moveTreeNode = useGroupStore((state) => state.moveTreeNode);
  const settings = useSettingsStore((state) => state.settings);
  const activeArticle = articles.find((article) => article.id === activeArticleId);

  function toggleFocusMode() {
    setIsFocusMode((current) => {
      const focusMode = !current;
      writeReaderLayoutPreferences({ focusMode });
      return focusMode;
    });
  }

  const initialFilter = useMemo<Partial<ArticleFilter>>(() => {
    if (params.articleId) return { view: 'all', showUnreadOnly: false };
    if (view === 'starred') return { view, showUnreadOnly: false };
    if (view === 'all') return { view, showUnreadOnly: false };
    if (view === 'feed') return { view, feedId: params.feedId, showUnreadOnly: false };
    if (view === 'folder') return { view, folder: params.name, showUnreadOnly: false };
    return { view: 'inbox', showUnreadOnly: settings.showUnreadOnly };
  }, [params.articleId, params.feedId, params.name, settings.showUnreadOnly, view]);

  useEffect(() => {
    void loadArticles(initialFilter);
  }, [initialFilter, loadArticles]);

  useEffect(() => {
    if (params.articleId) {
      setActiveArticle(params.articleId);
    }
  }, [params.articleId, setActiveArticle]);

  useEffect(() => {
    void loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (event.key === 'Escape' && isNavigationOpen) {
        setIsNavigationOpen(false);
        event.preventDefault();
        return;
      }
      if (event.key === 'j') {
        goNext();
        event.preventDefault();
        return;
      }
      if (event.key === 'k') {
        goPrev();
        event.preventDefault();
        return;
      }
      if (!activeArticleId || !activeArticle) return;
      if (event.key.toLowerCase() === 'f') {
        toggleFocusMode();
        event.preventDefault();
        return;
      }
      if (event.key === 'm') {
        void markRead(activeArticleId);
        event.preventDefault();
        return;
      }
      if (event.key === 's') {
        void starArticle(activeArticleId, !activeArticle.isStarred);
        event.preventDefault();
        return;
      }
      if (event.key === 'v') {
        void openArticleUrl(activeArticle.url);
        event.preventDefault();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeArticle, activeArticleId, goNext, goPrev, isNavigationOpen, markRead, starArticle]);

  return (
    <div
      data-testid="reader-layout"
      data-focus-mode={isFocusMode}
      data-has-article={Boolean(activeArticle)}
      data-navigation-open={isNavigationOpen}
      className="reader-layout surface-noise flex h-screen min-w-0 overflow-hidden bg-background text-foreground"
    >
      <button
        aria-label={t('navigation.closeMenu')}
        className="reader-navigation-backdrop"
        onClick={() => setIsNavigationOpen(false)}
      />
      <Sidebar
        currentView={view}
        activeFeedId={params.feedId}
        feeds={feeds}
        groups={groups}
        unreadCount={unreadCount}
        addFeed={addFeed}
        loadFeeds={loadFeeds}
        createGroup={createGroup}
        deleteGroup={deleteGroup}
        removeFeed={removeFeed}
        moveTreeNode={moveTreeNode}
        onNavigate={() => setIsNavigationOpen(false)}
      />
      <ArticlePanel
        articles={articles}
        feeds={feeds}
        activeArticleId={activeArticleId}
        filter={filter}
        isLoading={isLoading}
        error={articleError}
        setFilter={setFilter}
        refreshFeed={() => refreshFeed(view === 'feed' ? params.feedId : undefined)}
        setActiveArticle={setActiveArticle}
        onOpenNavigation={() => setIsNavigationOpen(true)}
      />
      <ReadingPane
        articles={articles}
        feeds={feeds}
        groups={groups}
        activeArticleId={activeArticleId}
        settings={settings}
        isFocusMode={isFocusMode}
        markRead={markRead}
        starArticle={starArticle}
        goPrev={goPrev}
        goNext={goNext}
        onOpenNavigation={() => setIsNavigationOpen(true)}
        onShowArticleList={() => setActiveArticle(null)}
        onToggleFocusMode={toggleFocusMode}
        summaryStatusByArticleId={summaryStatusByArticleId}
        summaryStaleByArticleId={summaryStaleByArticleId}
        summarizeArticle={summarizeArticle}
      />
    </div>
  );
}
