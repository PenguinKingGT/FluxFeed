import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Menu, Newspaper, RefreshCw, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/reader/Sidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isAiConfigured } from '@/lib/ai/ai-preferences';
import { useArticleStore, useDailyDigestStore, useFeedStore, useGroupStore, useSettingsStore } from '@/store';
import { cn } from '@/lib/utils';

export function DailyDigestLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const settings = useSettingsStore((state) => state.settings);
  const unreadCount = useArticleStore((state) => state.unreadCount);
  const loadUnreadCount = useArticleStore((state) => state.loadUnreadCount);
  const feeds = useFeedStore((state) => state.feeds);
  const addFeed = useFeedStore((state) => state.addFeed);
  const removeFeed = useFeedStore((state) => state.removeFeed);
  const loadFeeds = useFeedStore((state) => state.loadFeeds);
  const groups = useGroupStore((state) => state.groups);
  const loadGroups = useGroupStore((state) => state.loadGroups);
  const createGroup = useGroupStore((state) => state.createGroup);
  const deleteGroup = useGroupStore((state) => state.deleteGroup);
  const moveTreeNode = useGroupStore((state) => state.moveTreeNode);
  const digest = useDailyDigestStore((state) => state.digest);
  const articles = useDailyDigestStore((state) => state.articles);
  const scope = useDailyDigestStore((state) => state.scope);
  const stats = useDailyDigestStore((state) => state.stats);
  const isLoading = useDailyDigestStore((state) => state.isLoading);
  const isGenerating = useDailyDigestStore((state) => state.isGenerating);
  const error = useDailyDigestStore((state) => state.error);
  const hasNewContent = useDailyDigestStore((state) => state.hasNewContent);
  const setScope = useDailyDigestStore((state) => state.setScope);
  const prepareTodayDigest = useDailyDigestStore((state) => state.prepareTodayDigest);
  const generateTodayDigest = useDailyDigestStore((state) => state.generateTodayDigest);
  const configured = isAiConfigured(settings.ai);

  useEffect(() => {
    void Promise.all([
      loadUnreadCount(),
      loadGroups(),
      prepareTodayDigest(settings.ai.dailyDigestMaxArticles),
    ]);
  }, [
    loadGroups,
    loadUnreadCount,
    prepareTodayDigest,
    scope,
    settings.ai.dailyDigestMaxArticles,
  ]);

  const articleById = useMemo(
    () => new Map(articles.map((article) => [article.id, article])),
    [articles],
  );
  const validEntries = digest?.entries.filter((entry) => articleById.has(entry.articleId)) ?? [];
  const missingCount = (digest?.entries.length ?? 0) - validEntries.length;
  const newArticleCount = digest
    ? articles.filter((article) => !digest.articleIds.includes(article.id)).length
    : 0;
  const today = new Intl.DateTimeFormat(settings.language, { dateStyle: 'full' }).format(new Date());

  function changeScope(nextScope: 'all' | 'unread') {
    if (isGenerating || nextScope === scope) return;
    setScope(nextScope);
  }

  return (
    <div data-testid="daily-digest-layout" data-navigation-open={isNavigationOpen} className="reader-layout surface-noise flex h-screen min-w-0 overflow-hidden bg-background text-foreground">
      <button aria-label={t('navigation.closeMenu')} className="reader-navigation-backdrop" onClick={() => setIsNavigationOpen(false)} />
      <Sidebar
        currentView="digest"
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

      <main className="reader-scrollbar h-screen min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1040px] px-12 py-10 max-[800px]:px-5 max-[800px]:py-6">
          <header className="mb-10 border-b border-border pb-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <Button aria-label={t('navigation.openMenu')} title={t('navigation.openMenu')} className="reader-navigation-trigger rounded-lg text-muted-foreground" variant="ghost" size="icon-sm" onClick={() => setIsNavigationOpen(true)}>
                <Menu />
              </Button>
              <time className="text-xs text-muted-foreground">{today}</time>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-8 max-[700px]:grid-cols-1 max-[700px]:gap-5">
              <div>
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-border bg-card text-secondary">
                  <Newspaper className="size-5" />
                </div>
                <h1 className="font-reading text-4xl leading-tight font-semibold tracking-[-0.035em] text-foreground max-[600px]:text-3xl">{t('digest.title')}</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{t('digest.description')}</p>
              </div>
              <div className="inline-flex h-10 rounded-lg border border-border bg-card p-0.5">
                {(['all', 'unread'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={scope === value}
                    className={cn(
                      'rounded-md px-4 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60',
                      scope === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                    disabled={isGenerating}
                    onClick={() => changeScope(value)}
                  >
                    {value === 'all' ? t('digest.all') : t('digest.unread')}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {isLoading ? (
            <div className="space-y-5" role="status">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : articles.length === 0 ? (
            <section className="rounded-2xl border border-border bg-card px-8 py-14 text-center">
              <Newspaper className="mx-auto size-7 text-muted-foreground" />
              <h2 className="mt-5 font-reading text-2xl font-semibold">{scope === 'unread' ? t('digest.emptyUnread') : t('digest.empty')}</h2>
              {scope === 'unread' ? (
                <Button className="mt-6" variant="outline" onClick={() => changeScope('all')}>{t('digest.showAll')}</Button>
              ) : null}
            </section>
          ) : !configured ? (
            <section className="rounded-2xl border border-border bg-card px-8 py-10">
              <Sparkles className="size-6 text-secondary" />
              <h2 className="mt-5 font-reading text-2xl font-semibold">{t('digest.configure')}</h2>
              <Button className="mt-6" onClick={() => navigate('/settings?section=ai')}>
                {t('ai.configure')}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </section>
          ) : digest ? (
            <div>
              {hasNewContent ? (
                <div role="status" className="mb-6 flex items-center justify-between gap-5 rounded-xl border border-secondary/30 bg-secondary/8 px-5 py-4 max-[650px]:items-start max-[650px]:flex-col">
                  <p className="text-sm text-foreground">{t('digest.newContent', { count: Math.max(1, newArticleCount) })}</p>
                  <Button size="sm" variant="outline" disabled={isGenerating} onClick={() => void generateTodayDigest(settings.ai.dailyDigestMaxArticles, true)}>
                    <RefreshCw className={cn(isGenerating && 'animate-spin')} />
                    {t('digest.update')}
                  </Button>
                </div>
              ) : null}

              <section className="mb-10 border-b border-border pb-10">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="font-reading text-2xl font-semibold tracking-[-0.02em]">{t('digest.overview')}</h2>
                  {!hasNewContent ? (
                    <Button size="sm" variant="ghost" disabled={isGenerating} onClick={() => void generateTodayDigest(settings.ai.dailyDigestMaxArticles, true)}>
                      <RefreshCw className={cn(isGenerating && 'animate-spin')} />
                      {t('digest.update')}
                    </Button>
                  ) : null}
                </div>
                <p className="max-w-3xl whitespace-pre-line font-reading text-[17px] leading-8 text-foreground">{digest.overview}</p>
                <p className="mt-5 text-[11px] text-muted-foreground">{t('ai.generatedWith', { model: digest.model })} · {t('ai.mayBeInaccurate')}</p>
              </section>

              {digest.topics.length > 0 ? (
                <section className="mb-10">
                  <h2 className="mb-4 text-sm font-semibold">{t('digest.topics')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {digest.topics.map((topic) => (
                      <span key={topic.name} className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground">
                        {topic.name} <span className="ml-1 text-muted-foreground">{topic.articleIds.length}</span>
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <h2 className="mb-3 font-reading text-2xl font-semibold tracking-[-0.02em]">{t('digest.stories')}</h2>
                {missingCount > 0 ? <p role="status" className="mb-3 text-xs text-muted-foreground">{t('digest.stale')}</p> : null}
                <div className="border-y border-border">
                  {validEntries.map((entry) => (
                    <button
                      key={entry.articleId}
                      type="button"
                      className="group grid w-full grid-cols-[minmax(0,1fr)_auto] gap-6 border-b border-border/70 px-1 py-7 text-left outline-none last:border-b-0 hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 max-[650px]:grid-cols-1 max-[650px]:gap-4"
                      onClick={() => navigate(`/article/${encodeURIComponent(entry.articleId)}`)}
                    >
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{entry.source}</span>
                          <time>{new Intl.DateTimeFormat(settings.language, { hour: '2-digit', minute: '2-digit' }).format(entry.publishedAt)}</time>
                          {entry.topics.map((topic) => <span key={topic}>{topic}</span>)}
                        </div>
                        <h3 className="font-reading text-xl leading-7 font-semibold tracking-[-0.015em] text-foreground">{entry.title}</h3>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{entry.brief}</p>
                        {entry.whyItMatters ? <p className="mt-3 text-xs leading-5 text-foreground"><span className="font-semibold">{t('digest.whyItMatters')}:</span> {entry.whyItMatters}</p> : null}
                      </div>
                      <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 max-[650px]:hidden" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <section className="rounded-2xl border border-border bg-card px-7 py-7">
              <div className="flex items-start justify-between gap-7 max-[700px]:flex-col">
                <div>
                  <p className="text-sm font-semibold">{t('digest.articleCount', { count: stats?.totalArticles ?? articles.length })}</p>
                  {(stats?.processedArticles ?? 0) < (stats?.totalArticles ?? 0) ? <p className="mt-1 text-xs text-muted-foreground">{t('digest.processedCount', { count: stats?.processedArticles })}</p> : null}
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">{t('digest.requestCount', { count: stats?.estimatedRequests ?? 0 })}. {t('digest.privacy')}</p>
                  {error ? <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-destructive"><AlertCircle className="size-3.5" />{t('digest.error')}</p> : null}
                </div>
                <Button className="shrink-0" disabled={isGenerating} onClick={() => void generateTodayDigest(settings.ai.dailyDigestMaxArticles)}>
                  {isGenerating ? <RefreshCw className="animate-spin" /> : <Sparkles />}
                  {isGenerating ? t('digest.generating') : t('digest.generate')}
                </Button>
              </div>
              {isGenerating ? (
                <div className="mt-7 space-y-3" role="status">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-[84%]" />
                  <Skeleton className="h-3 w-[68%]" />
                </div>
              ) : null}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
