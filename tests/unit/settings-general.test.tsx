import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '@/lib/types';
import { GeneralSection } from '@/components/settings/GeneralSection';

const settings: Settings = {
  id: 'global',
  refreshInterval: 60,
  maxArticlesPerFeed: 200,
  retentionDays: 90,
  theme: 'system',
  colorTheme: 'quiet-signal',
  language: 'en',
  readingFont: 'system-serif',
  interfaceFont: 'system-sans',
  fontSize: 'medium',
  markReadOnOpen: true,
  showUnreadOnly: false,
  ai: {
    apiUrl: '',
    model: '',
    summaryLanguage: 'auto',
    summaryLength: 'standard',
    customInstructions: '',
    dailyDigestMaxArticles: 100,
    autoSummarizeOnOpen: false,
    autoSummarizeMinCharacters: 1000,
  },
};

describe('GeneralSection', () => {
  afterEach(() => cleanup());

  it('updates refresh interval, reading defaults, limits, and retention period', () => {
    const updateSettings = vi.fn();

    render(<GeneralSection settings={settings} updateSettings={updateSettings} />);

    const interval = screen.getByLabelText('Refresh Interval') as HTMLInputElement;
    expect(interval.value).toBe('60');
    fireEvent.change(interval, { target: { value: '30' } });
    expect(updateSettings).toHaveBeenCalledWith({ refreshInterval: 30 });

    const toggle = screen.getByRole('switch', { name: 'Auto-mark as Read' });
    expect(toggle.className).toContain('bg-primary');
    fireEvent.click(toggle);
    expect(updateSettings).toHaveBeenCalledWith({ markReadOnOpen: false });

    fireEvent.click(screen.getByRole('switch', { name: 'Unread Inbox' }));
    expect(updateSettings).toHaveBeenCalledWith({ showUnreadOnly: true });

    fireEvent.change(screen.getByLabelText('Articles per Feed'), { target: { value: '400' } });
    expect(updateSettings).toHaveBeenCalledWith({ maxArticlesPerFeed: 400 });

    const retention = screen.getByLabelText('Retention Period') as HTMLSelectElement;
    expect(retention.value).toBe('90');
    fireEvent.change(retention, { target: { value: '30' } });
    expect(updateSettings).toHaveBeenCalledWith({ retentionDays: 30 });
  });
});
