import { useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, BookOpen, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { extractPlainText } from '@/lib/security/sanitize-html';
import type { Article, Feed, Group, Settings } from '@/lib/types';
import { ActionBar } from './ActionBar';
import { AiSummaryPanel } from './AiSummaryPanel';
import { ArticleContent } from './ArticleContent';
import { estimateReadMinutes, formatArticleDate } from './reader-format';
import { openArticleUrl } from './reader-runtime';
import { useAutoSummary } from './use-auto-summary';

interface ReadingPaneProps {
  articles: Article[];
  feeds: Feed[];
  groups: Group[];
  activeArticleId: string | null;
  settings: Settings;
  isFocusMode: boolean;
  markRead: (articleId: string) => Promise<void>;
  starArticle: (articleId: string, starred: boolean) => Promise<void>;
  goPrev: () => void;
  goNext: () => void;
  onOpenNavigation: () => void;
  onShowArticleList: () => void;
  onToggleFocusMode: () => void;
  summaryStatusByArticleId?: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
  summaryStaleByArticleId?: Record<string, boolean>;
  summarizeArticle?: (
    articleId: string,
    contentText: string,
    options: { force?: boolean; trigger: 'manual' | 'auto' },
  ) => Promise<void>;
}

async function noopSummarizeArticle() {}

export function ReadingPane({
  articles,
  feeds,
  groups,
  activeArticleId,
  settings,
  isFocusMode,
  markRead,
  starArticle,
  goPrev,
  goNext,
  onOpenNavigation,
  onShowArticleList,
  onToggleFocusMode,
  summaryStatusByArticleId = {},
  summaryStaleByArticleId = {},
  summarizeArticle = noopSummarizeArticle,
}: ReadingPaneProps) {
  const { t } = useTranslation();
  const paneRef = useRef<HTMLElement>(null);
  const feedById = useMemo(() => new Map(feeds.map((feed) => [feed.id, feed])), [feeds]);
  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const activeIndex = articles.findIndex((article) => article.id === activeArticleId);
  const article = activeIndex >= 0 ? articles[activeIndex] : null;
  const feed = article ? feedById.get(article.feedId) : undefined;
  const folderName = feed?.groupId ? groupById.get(feed.groupId)?.name : undefined;
  const contentText = useMemo(() => article ? extractPlainText(article.content) : '', [article?.content]);
  const summaryStatus = article
    ? summaryStatusByArticleId[article.id] ?? 'idle'
    : 'idle';

  useAutoSummary({
    article,
    contentText,
    settings,
    status: summaryStatus,
    summarizeArticle,
  });

  useEffect(() => {
    if (typeof paneRef.current?.scrollTo === 'function') {
      paneRef.current.scrollTo({ top: 0 });
    }
  }, [activeArticleId]);

  useEffect(() => {
    if (article && settings.markReadOnOpen && !article.isRead) {
      void markRead(article.id);
    }
  }, [article?.id, article?.isRead, markRead, settings.markReadOnOpen]);

  if (!article) {
    return (
      <section className="reader-reading-pane reader-scrollbar flex h-screen min-w-0 flex-1 items-center justify-center overflow-y-auto bg-background">
        <div className="max-w-sm px-8 text-center text-muted-foreground">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-border bg-card shadow-[0_12px_35px_color-mix(in_srgb,var(--foreground)_7%,transparent)]">
            <BookOpen className="size-7 text-secondary" strokeWidth={1.5} />
          </div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase">{t('app.subtitle')}</p>
          <h2 className="font-serif text-3xl font-semibold tracking-[-0.03em] text-foreground">{t('reader.selectArticle')}</h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6">{t('reader.selectArticleDescription')}</p>
        </div>
      </section>
    );
  }

  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= articles.length - 1;

  return (
    <section ref={paneRef} data-testid="reading-pane" className="reader-reading-pane reading-pane reader-scrollbar relative h-screen min-w-0 flex-1 overflow-y-auto bg-background">
      <article className="reader-content px-8 pb-24">
        <header className="mb-10">
          <div className="sticky top-0 z-10 mb-10 flex min-h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/88 py-2 backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-2">
              <Button aria-label={t('navigation.openMenu')} title={t('navigation.openMenu')} className="reader-navigation-trigger rounded-lg text-muted-foreground" variant="ghost" size="icon-sm" onClick={onOpenNavigation}>
                <Menu />
              </Button>
              <Button aria-label={t('reader.backToArticles')} title={t('reader.backToArticles')} className="reader-mobile-back rounded-lg text-muted-foreground" variant="ghost" size="icon-sm" onClick={onShowArticleList}>
                <ArrowLeft />
              </Button>
              {folderName ? (
                <span className="rounded-md bg-secondary/18 px-2 py-1 text-[10px] font-semibold tracking-[0.1em] text-foreground uppercase">
                  {folderName}
                </span>
              ) : null}
              {folderName ? <span className="h-3 w-px bg-border" /> : null}
              <time className="text-[10px] text-muted-foreground tabular-nums">{formatArticleDate(article.publishedAt, settings.language)}</time>
            </div>
            <ActionBar
              isStarred={article.isStarred}
              onOpenOriginal={() => void openArticleUrl(article.url)}
              onToggleStar={() => void starArticle(article.id, !article.isStarred)}
              onMarkRead={() => void markRead(article.id)}
              isFocusMode={isFocusMode}
              onToggleFocusMode={onToggleFocusMode}
            />
          </div>
          <h1 className="reader-title mb-9 font-reading leading-[1.06] font-semibold tracking-[-0.035em] text-foreground">{article.title}</h1>
          <div className="flex items-center gap-4 border-y border-border/80 py-5">
            <div className="flex size-11 items-center justify-center overflow-hidden rounded-xl border border-border bg-accent font-serif text-base font-semibold text-accent-foreground">
              {(article.author || feed?.title || 'F').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{article.author || feed?.title || t('reader.unknownAuthor')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{feed?.title ?? 'FluxFeed'} <span className="mx-1 opacity-40">/</span> {estimateReadMinutes(article.content, settings.language)}</p>
            </div>
          </div>
        </header>
        <AiSummaryPanel
          article={article}
          contentText={contentText}
          settings={settings}
          status={summaryStatus}
          stale={summaryStaleByArticleId[article.id] ?? false}
          summarizeArticle={summarizeArticle}
        />
        <ArticleContent html={article.content} settings={settings} />
        <footer className="mt-24 flex flex-col items-center border-t border-border pt-10">
          <div className="mb-7 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{t('reader.endOfArticle')}</div>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="rounded-full px-6" disabled={isFirst} onClick={goPrev}>
              {t('reader.previous')}
            </Button>
            <Button size="lg" className="rounded-full px-6" disabled={isLast} onClick={goNext}>
              {t('reader.nextArticle')}
            </Button>
          </div>
        </footer>
      </article>
    </section>
  );
}
