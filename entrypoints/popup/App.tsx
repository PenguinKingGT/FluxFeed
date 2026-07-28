import { useEffect, useMemo } from 'react';
import { ArticleList } from '@/components/popup/ArticleList';
import { FeedDetectionBanner } from '@/components/popup/FeedDetectionBanner';
import { PopupFooter } from '@/components/popup/PopupFooter';
import { PopupHeader } from '@/components/popup/PopupHeader';
import { RecentArticlesHeader } from '@/components/popup/RecentArticlesHeader';
import { openArticleInOptions, openSettingsInOptions } from '@/components/popup/popup-runtime';
import { useArticleStore, useDetectedFeedStore, useFeedStore, useSettingsStore } from '@/store';

export function App() {
  const detectedFeeds = useDetectedFeedStore((state) => state.detectedFeeds);
  const checkDetectedFeeds = useDetectedFeedStore((state) => state.check);
  const feeds = useFeedStore((state) => state.feeds);
  const loadFeeds = useFeedStore((state) => state.loadFeeds);
  const addFeed = useFeedStore((state) => state.addFeed);
  const articles = useArticleStore((state) => state.articles);
  const loadArticles = useArticleStore((state) => state.loadArticles);
  const markAllRead = useArticleStore((state) => state.markAllRead);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    void checkDetectedFeeds();
    void loadFeeds();
    void loadArticles({ view: 'inbox', showUnreadOnly: true });
    void loadSettings();
  }, [checkDetectedFeeds, loadFeeds, loadArticles, loadSettings]);

  const unreadCount = articles.filter((article) => !article.isRead).length;
  const subscribedUrls = useMemo(() => new Set(feeds.map((feed) => feed.url)), [feeds]);
  async function handleSubscribe(url: string) {
    const response = await addFeed(url);
    if (response.success) {
      await loadArticles({ view: 'inbox', showUnreadOnly: true });
    }
    return response;
  }

  return (
    <div data-testid="popup-shell" className="surface-noise flex h-150 w-100 flex-col overflow-hidden bg-background text-foreground">
      <PopupHeader onOpenDashboard={() => void openSettingsInOptions()} />
      {detectedFeeds.length > 0 ? (
        <FeedDetectionBanner
          feeds={detectedFeeds}
          subscribedUrls={subscribedUrls}
          onSubscribe={handleSubscribe}
        />
      ) : null}
      <RecentArticlesHeader unreadCount={unreadCount} />
      <ArticleList
        articles={articles.slice(0, 10)}
        feeds={feeds}
        onOpenArticle={(articleId) => void openArticleInOptions(articleId)}
      />
      <PopupFooter
        onOpenSettings={() => void openSettingsInOptions()}
        onMarkAllRead={() => void markAllRead()}
      />
    </div>
  );
}
