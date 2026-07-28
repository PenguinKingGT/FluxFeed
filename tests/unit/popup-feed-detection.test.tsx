import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedDetectionBanner } from '@/components/popup/FeedDetectionBanner';

describe('FeedDetectionBanner', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows subscribe action when detected feed is not subscribed', () => {
    render(
      <FeedDetectionBanner
        feeds={[{ url: 'https://example.com/feed.xml', title: 'RSS' }]}
        subscribedUrls={new Set()}
        onSubscribe={vi.fn()}
      />,
    );

    expect(screen.getByText('Feed detected on this page')).not.toBeNull();
    expect(screen.getByText('Subscribe to this page')).not.toBeNull();
  });

  it('shows already subscribed state when feed url exists', () => {
    render(
      <FeedDetectionBanner
        feeds={[{ url: 'https://example.com/feed.xml', title: 'RSS' }]}
        subscribedUrls={new Set(['https://example.com/feed.xml'])}
        onSubscribe={vi.fn()}
      />,
    );

    expect(screen.getByText('Already subscribed')).not.toBeNull();
  });

  it('shows success state after subscribe resolves', async () => {
    render(
      <FeedDetectionBanner
        feeds={[{ url: 'https://example.com/feed.xml', title: 'RSS' }]}
        subscribedUrls={new Set()}
        onSubscribe={vi.fn().mockResolvedValue({ success: true })}
      />,
    );

    fireEvent.click(screen.getByText('Subscribe to this page'));

    await waitFor(() => expect(screen.getByText('Subscribed ✓')).not.toBeNull());
  });

  it('shows error state after subscribe fails', async () => {
    render(
      <FeedDetectionBanner
        feeds={[{ url: 'https://example.com/feed.xml', title: 'RSS' }]}
        subscribedUrls={new Set()}
        onSubscribe={vi.fn().mockResolvedValue({ success: false, error: 'Invalid feed' })}
      />,
    );

    fireEvent.click(screen.getByText('Subscribe to this page'));

    await waitFor(() => expect(screen.getByText('Invalid feed')).not.toBeNull());
  });

  it('lets the user select a different detected feed and checks its own subscription state', async () => {
    const onSubscribe = vi.fn().mockResolvedValue({ success: true });
    render(
      <FeedDetectionBanner
        feeds={[
          { url: 'https://example.com/main.xml', title: 'Main feed' },
          { url: 'https://example.com/comments.xml', title: 'Comments' },
        ]}
        subscribedUrls={new Set(['https://example.com/comments.xml'])}
        onSubscribe={onSubscribe}
      />,
    );

    fireEvent.change(screen.getByLabelText('Select a feed to subscribe'), {
      target: { value: 'https://example.com/main.xml' },
    });
    fireEvent.click(screen.getByText('Subscribe to this page'));

    await waitFor(() => expect(onSubscribe).toHaveBeenCalledWith('https://example.com/main.xml'));
  });
});
