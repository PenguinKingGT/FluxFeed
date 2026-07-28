import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '@/lib/types';
import { AppearanceSection } from '@/components/settings/AppearanceSection';

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
  markReadOnOpen: false,
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

describe('AppearanceSection', () => {
  afterEach(() => cleanup());

  it('updates color theme, appearance mode, and font size', () => {
    const updateSettings = vi.fn();

    render(<AppearanceSection settings={settings} updateSettings={updateSettings} />);

    expect(screen.getByText('Color Theme')).not.toBeNull();
    expect(screen.getByRole('radiogroup', { name: 'Color Theme' })).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'Quiet Signal' }).getAttribute('data-state')).toBe('checked');
    fireEvent.click(screen.getByText('Graphite'));
    expect(updateSettings).toHaveBeenCalledWith({ colorTheme: 'graphite' });

    expect(screen.getByText('Appearance Mode')).not.toBeNull();
    fireEvent.click(screen.getByText('Dark'));
    expect(updateSettings).toHaveBeenCalledWith({ theme: 'dark' });

    const preview = screen.getByText('A comfortable type size keeps long articles calm, clear, and easy to follow.');
    expect(preview.style.fontSize).toBe('17px');
    fireEvent.click(screen.getByLabelText('Large 19px'));
    expect(updateSettings).toHaveBeenCalledWith({ fontSize: 'large' });

    expect(screen.getByText('Article Text Size')).not.toBeNull();
    const readingGroup = screen.getByRole('radiogroup', { name: 'Reading Font' });
    expect(within(readingGroup).getByRole('radio', { name: 'Classic Reading' })).not.toBeNull();
    expect(within(readingGroup).getByRole('radio', { name: 'Clean & Modern' })).not.toBeNull();
    fireEvent.click(within(readingGroup).getByRole('radio', { name: 'LXGW WenKai' }));
    expect(updateSettings).toHaveBeenCalledWith({ readingFont: 'lxgw-wenkai' });

    const interfaceGroup = screen.getByRole('radiogroup', { name: 'Interface Font' });
    expect(within(interfaceGroup).getByRole('radio', { name: 'System Default' })).not.toBeNull();
    fireEvent.click(within(interfaceGroup).getByRole('radio', { name: 'LXGW WenKai' }));
    expect(updateSettings).toHaveBeenCalledWith({ interfaceFont: 'lxgw-wenkai' });

    expect(screen.getByText('Small')).not.toBeNull();
    expect(screen.getByText('Standard')).not.toBeNull();
    expect(screen.getByText('Large')).not.toBeNull();
  });

  it('updates the interface language', async () => {
    const updateSettings = vi.fn();

    render(<AppearanceSection settings={settings} updateSettings={updateSettings} />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Language' }));
    fireEvent.click(await screen.findByRole('option', { name: '日本語' }));

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({ language: 'ja' });
    });
  });
});
