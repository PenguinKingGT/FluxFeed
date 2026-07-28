import { useEffect, useState } from 'react';
import { Check, Loader2, Rss } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { DetectedFeed } from '@/lib/content/content-detector';
import type { MessageResponse } from '@/lib/types';

interface FeedDetectionBannerProps {
  feeds: DetectedFeed[];
  subscribedUrls: ReadonlySet<string>;
  onSubscribe: (url: string) => Promise<MessageResponse>;
}

export function FeedDetectionBanner({ feeds, subscribedUrls, onSubscribe }: FeedDetectionBannerProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState(feeds[0]?.url ?? '');
  const selectedFeed = feeds.find((feed) => feed.url === selectedUrl) ?? feeds[0];

  useEffect(() => {
    if (!feeds.some((feed) => feed.url === selectedUrl)) {
      setSelectedUrl(feeds[0]?.url ?? '');
    }
  }, [feeds, selectedUrl]);

  if (!selectedFeed) {
    return null;
  }

  async function handleSubscribe() {
    setStatus('loading');
    setError(null);
    const response = await onSubscribe(selectedFeed.url);
    if (response.success) {
      setStatus('success');
      return;
    }
    setStatus('error');
    setError(response.error ?? t('popup.subscribeFailed'));
  }

  const subscribed = subscribedUrls.has(selectedFeed.url) || status === 'success';

  return (
    <section className="px-3 pt-3" aria-label="Detected feed">
      <div className="flex items-center gap-3 rounded-xl border border-secondary/25 bg-secondary/8 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
          <Rss className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{t('popup.feedDetected')}</p>
          {feeds.length > 1 ? (
            <select
              aria-label={t('popup.selectFeed')}
              value={selectedFeed.url}
              className="mt-1 h-7 w-full rounded-md border border-border bg-background px-2 text-[10px] text-foreground outline-none focus:border-ring"
              onChange={(event) => {
                setSelectedUrl(event.target.value);
                setStatus('idle');
                setError(null);
              }}
            >
              {feeds.map((feed) => (
                <option key={feed.url} value={feed.url}>
                  {feed.title ?? feed.url}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {subscribed ? t('popup.alreadySubscribed') : (selectedFeed.title ?? selectedFeed.url)}
            </p>
          )}
        </div>
        <Button
          className="shrink-0 rounded-lg"
          disabled={subscribed || status === 'loading'}
          size="sm"
          variant={subscribed ? 'outline' : 'default'}
          onClick={handleSubscribe}
        >
          {status === 'loading' ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
          {subscribed ? <Check data-icon="inline-start" /> : null}
          {subscribed ? t('popup.subscribed') : t('popup.subscribe')}
        </Button>
      </div>
      {error ? <p className="px-2 pt-2 text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
