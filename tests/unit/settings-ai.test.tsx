import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiSection } from '@/components/settings/AiSection';
import type { Settings } from '@/lib/types';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@/store/message-client', () => ({
  messageClient: { send },
}));

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
    apiUrl: 'https://ai.example.com/v1/chat/completions',
    model: 'reader-model',
    summaryLanguage: 'auto',
    summaryLength: 'standard',
    customInstructions: '',
    dailyDigestMaxArticles: 100,
    autoSummarizeOnOpen: false,
    autoSummarizeMinCharacters: 1000,
  },
};

describe('AiSection', () => {
  afterEach(() => {
    cleanup();
    send.mockReset();
  });

  it('updates automatic summary controls', async () => {
    send.mockResolvedValue({ success: true, data: { hasApiKey: false } });
    const updateSettings = vi.fn();

    render(<AiSection settings={settings} updateSettings={updateSettings} />);
    await waitFor(() => expect(send).toHaveBeenCalledWith({ action: 'AI_CREDENTIAL_STATUS' }));

    fireEvent.click(screen.getByRole('switch', { name: 'Summarize on open' }));
    expect(updateSettings).toHaveBeenCalledWith({
      ai: { ...settings.ai, autoSummarizeOnOpen: true },
    });

    const minimum = screen.getByRole('spinbutton', { name: 'Minimum article length' });
    expect((minimum as HTMLInputElement).disabled).toBe(true);
  });

  it('stores a secret separately and tests the configured endpoint', async () => {
    send
      .mockResolvedValueOnce({ success: true, data: { hasApiKey: false } })
      .mockResolvedValueOnce({ success: true, data: { hasApiKey: true } })
      .mockResolvedValueOnce({ success: true });

    render(<AiSection settings={settings} updateSettings={vi.fn()} />);
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'local-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    await waitFor(() => {
      expect(send).toHaveBeenCalledWith({
        action: 'AI_CREDENTIAL_UPDATE',
        payload: { apiKey: 'local-secret' },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({ action: 'AI_CONNECTION_TEST' }));
  });

});
