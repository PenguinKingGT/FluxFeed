import type { Article, Feed } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { Favicon } from './Favicon';
import { formatRelativeTime } from './popup-format';

interface ArticleListItemProps {
  article: Article;
  feed?: Feed;
  onOpenArticle: (articleId: string) => void;
}

export function ArticleListItem({ article, feed, onOpenArticle }: ArticleListItemProps) {
  const { t, i18n } = useTranslation();
  const sourceTitle = feed?.title ?? t('popup.unknownFeed');

  return (
    <article
      role="button"
      tabIndex={0}
      className="interactive-row group relative flex min-h-21 cursor-pointer gap-3 rounded-xl px-3 py-3.5 outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring/60"
      onClick={() => onOpenArticle(article.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenArticle(article.id);
        }
      }}
    >
      <div className="w-1.5 shrink-0 pt-7">
        {!article.isRead ? <div className="size-1.5 rounded-full bg-secondary shadow-[0_0_0_3px_color-mix(in_srgb,var(--secondary)_14%,transparent)]" /> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <Favicon url={feed?.siteUrl ?? article.url} title={sourceTitle} imageUrl={feed?.iconUrl} />
          <span className="truncate">{sourceTitle}</span>
          <span className="opacity-40">/</span>
          <span className="text-[10px] tabular-nums">{formatRelativeTime(article.publishedAt, i18n.language as 'en' | 'zh-CN' | 'ja')}</span>
        </div>
        <h3 className="line-clamp-2 font-serif text-[16px] leading-[1.3] font-medium tracking-[-0.012em] text-foreground group-hover:text-foreground">
          {article.title}
        </h3>
      </div>
      <span className="absolute right-3 bottom-2 h-px w-[calc(100%-3.75rem)] bg-border/70 group-last:hidden" />
    </article>
  );
}
