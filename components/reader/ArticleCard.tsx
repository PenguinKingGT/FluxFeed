import type { Article, Feed } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Favicon } from '@/components/popup/Favicon';
import { formatRelativeTime, getArticleTags } from './reader-format';

interface ArticleCardProps {
  article: Article;
  feed?: Feed;
  isActive: boolean;
  onSelect: (articleId: string) => void;
}

export function ArticleCard({ article, feed, isActive, onSelect }: ArticleCardProps) {
  const source = feed?.title ?? 'Unknown Feed';
  const tags = getArticleTags(article);

  return (
    <article
      role="button"
      tabIndex={0}
      className={cn(
        'interactive-row group relative cursor-pointer border-b border-border/80 px-5 py-4 outline-none hover:bg-muted/70 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60',
        isActive && 'bg-accent shadow-[inset_3px_0_var(--secondary)] hover:bg-accent',
        article.isRead && !isActive && 'opacity-50 hover:opacity-100',
      )}
      onClick={() => onSelect(article.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(article.id);
        }
      }}
    >
      {!article.isRead ? <div className="absolute top-5 left-2 size-1.5 rounded-full bg-secondary" /> : null}
      <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        <span className="flex min-w-0 items-center gap-2 truncate">
          <Favicon url={feed?.siteUrl ?? article.url} title={source} imageUrl={feed?.iconUrl} />
          <span className="truncate">{source}</span>
        </span>
        <span className="shrink-0 tracking-normal opacity-60">{formatRelativeTime(article.publishedAt)}</span>
      </div>
      <h3 className="mb-2 line-clamp-2 font-serif text-[18px] leading-6 font-semibold tracking-[-0.018em] text-foreground">{article.title}</h3>
      <p className="line-clamp-2 text-[12px] leading-5 text-muted-foreground">{article.summary}</p>
      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className={cn('rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.06em] uppercase', isActive ? 'border-secondary/25 bg-secondary/12 text-foreground' : 'border-border bg-muted text-muted-foreground')}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
