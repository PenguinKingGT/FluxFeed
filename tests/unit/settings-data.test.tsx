import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Feed } from '@/lib/types';
import { DataSection } from '@/components/settings/DataSection';

const addFeed = vi.fn();
const createGroup = vi.fn();
const loadArticles = vi.fn();
const anchorClick = vi.fn();
const createObjectURL = vi.fn(() => 'blob:fluxfeed');
const revokeObjectURL = vi.fn();

vi.mock('@/store', () => ({
  useArticleStore: (selector: any) => selector({ loadArticles }),
}));

const feeds: Feed[] = [{
  id: 'feed-1',
  url: 'https://example.com/feed.xml',
  title: 'Example',
  description: '',
  siteUrl: 'https://example.com',
  iconUrl: '',
  refreshInterval: 60,
  errorCount: 0,
  createdAt: 1,
}];

describe('DataSection', () => {
  beforeEach(() => {
    addFeed.mockReset().mockResolvedValue({ success: true });
    createGroup.mockReset().mockResolvedValue({ success: true });
    loadArticles.mockClear();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    anchorClick.mockClear();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(createObjectURL);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectURL);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      if (tagName === 'a') {
        element.click = anchorClick;
      }
      return element as HTMLElement;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('imports and exports OPML', async () => {
    render(<DataSection feeds={feeds} groups={[]} addFeed={addFeed} createGroup={createGroup} />);

    expect(screen.getByText('Import OPML')).not.toBeNull();
    expect(screen.getByText('Export OPML')).not.toBeNull();

    const file = new File(['<opml><body><outline xmlUrl="https://import.test/rss" /></body></opml>'], 'feeds.opml', { type: 'text/xml' });
    fireEvent.change(screen.getByLabelText('Import OPML file'), { target: { files: [file] } });
    await waitFor(() => expect(addFeed).toHaveBeenCalledWith('https://import.test/rss', undefined));
    expect(loadArticles).toHaveBeenCalledWith({ view: 'inbox' });

    fireEvent.click(screen.getByText('Export OPML'));
    expect(createObjectURL).toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fluxfeed');
  });
});
