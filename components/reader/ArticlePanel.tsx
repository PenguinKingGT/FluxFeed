import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, RefreshCw, Search, SearchX, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Article, Feed } from '@/lib/types';
import type { ArticleFilter } from '@/store/articleStore';
import { ArticleCard } from './ArticleCard';

interface ArticlePanelProps {
  articles: Article[];
  feeds: Feed[];
  activeArticleId: string | null;
  filter: ArticleFilter;
  isLoading: boolean;
  error?: string | null;
  setFilter: (filter: Partial<ArticleFilter>) => void;
  refreshFeed: () => Promise<void> | void;
  setActiveArticle: (articleId: string) => void;
  onOpenNavigation: () => void;
}

export function ArticlePanel({ articles, feeds, activeArticleId, filter, isLoading, error, setFilter, refreshFeed, setActiveArticle, onOpenNavigation }: ArticlePanelProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(filter.searchQuery ?? '');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const feedById = useMemo(() => new Map(feeds.map((feed) => [feed.id, feed])), [feeds]);
  const estimatedArticleHeight = 164;
  const rowVirtualizer = useVirtualizer({
    count: articles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedArticleHeight,
    overscan: 6,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const renderedItems = virtualItems.length > 0 ? virtualItems : articles.map((_, index) => ({ key: index, index, start: index * estimatedArticleHeight, size: estimatedArticleHeight }));

  useEffect(() => {
    const timer = window.setTimeout(() => setFilter({ searchQuery: query }), 300);
    return () => window.clearTimeout(timer);
  }, [query, setFilter]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await refreshFeed();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <main data-testid="article-panel" className="reader-article-panel flex h-screen w-[340px] shrink-0 flex-col border-r border-border bg-card/95">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 px-4 pt-4 pb-3 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Button aria-label={t('navigation.openMenu')} title={t('navigation.openMenu')} className="reader-navigation-trigger -ml-2 rounded-lg text-muted-foreground" variant="ghost" size="icon-sm" onClick={onOpenNavigation}>
              <Menu />
            </Button>
            <h2 className="truncate font-serif text-lg font-semibold tracking-[-0.02em] text-foreground">
              {filter.searchQuery ? t('reader.searchResults') : t('reader.articleList')}
            </h2>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {t('reader.articleCount', { count: articles.length })}
          </span>
        </div>
        <div className="flex items-center gap-2">
        <div className="group relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground opacity-60 group-focus-within:text-ring group-focus-within:opacity-100" />
          <input
            aria-label={t('reader.searchPlaceholder')}
            className="h-9 w-full rounded-lg border border-transparent bg-muted pr-9 pl-9 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-ring/40 focus:bg-background focus:ring-3 focus:ring-ring/15"
            placeholder={t('reader.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              aria-label={t('reader.clearSearch')}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              onClick={() => setQuery('')}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
          <Button
            aria-label={isRefreshing ? t('reader.refreshingFeeds') : t('reader.refreshFeeds')}
            disabled={isRefreshing}
            variant="outline"
            size="icon-lg"
            className="rounded-lg text-muted-foreground"
            onClick={() => void handleRefresh()}
          >
            <RefreshCw className={isRefreshing ? 'animate-spin' : undefined} />
          </Button>
        </div>
      </header>
      {error ? (
        <p role="alert" className="border-b border-destructive/25 bg-destructive/8 px-4 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div ref={parentRef} className="reader-scrollbar flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-32 bg-muted" />
            <Skeleton className="h-32 bg-muted" />
            <Skeleton className="h-24 bg-muted" />
          </div>
        ) : articles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
              <SearchX className="size-5" />
            </div>
            <p className="font-serif text-lg font-semibold text-foreground">{t('reader.noMatchingArticles')}</p>
            {query ? (
              <button className="mt-2 text-xs font-semibold text-ring hover:underline" onClick={() => setQuery('')}>
                {t('reader.clearSearch')}
              </button>
            ) : null}
          </div>
        ) : (
          <div style={{ height: rowVirtualizer.getTotalSize() || articles.length * estimatedArticleHeight, position: 'relative' }}>
            {renderedItems.map((item) => {
              const article = articles[item.index];
              return (
                <div
                  key={item.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={item.index}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}
                >
                  <ArticleCard article={article} feed={feedById.get(article.feedId)} isActive={article.id === activeArticleId} onSelect={setActiveArticle} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
