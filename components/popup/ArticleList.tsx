import { Check, Rss } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Article, Feed } from '@/lib/types';
import { ArticleListItem } from './ArticleListItem';
import { PopupEmptyState } from './PopupEmptyState';

interface ArticleListProps {
  articles: Article[];
  feeds: Feed[];
  hasFeeds?: boolean;
  onOpenArticle: (articleId: string) => void;
}

export function ArticleList({
  articles,
  feeds,
  hasFeeds = feeds.length > 0,
  onOpenArticle,
}: ArticleListProps) {
  const { t } = useTranslation();
  if (!hasFeeds) {
    return (
      <PopupEmptyState
        icon={<Rss className="size-5" />}
        title={t('popup.noFeeds')}
        description={t('popup.noFeedsDescription')}
      />
    );
  }

  if (articles.length === 0) {
    return (
      <PopupEmptyState
        icon={<Check className="size-5" />}
        title={t('popup.caughtUp')}
        description={t('popup.noUnread')}
      />
    );
  }

  const feedById = new Map(feeds.map((feed) => [feed.id, feed]));

  return (
    <div className="reader-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-2">
      {articles.map((article) => (
        <ArticleListItem
          key={article.id}
          article={article}
          feed={feedById.get(article.feedId)}
          onOpenArticle={onOpenArticle}
        />
      ))}
    </div>
  );
}
