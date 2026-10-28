import { useState } from 'react';
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

/** Applies settings patches so provider-switch behavior is exercised as in the page. */
function StatefulAiSettings() {
  const [current, setCurrent] = useState(settings);
  return (
    <AiSection
      settings={current}
      updateSettings={(patch) => setCurrent((previous) => ({ ...previous, ...patch }))}
    />
  );
}

describe('AiSection', () => {
  afterEach(() => {
    cleanup();
    send.mockReset();
  });

  it('updates automatic summary controls', async () => {
    send.mockResolvedValue({ success: true, data: { hasApiKey: false } });
    const updateSettings = vi.fn();

    render(<AiSection settings={settings} updateSettings={updateSettings} />);
    await waitFor(() => expect(send).toHaveBeenCalledWith({ action: 'AI_CREDENTIAL_STATUS', payload: { provider: 'openai-compatible' } }));

    fireEvent.click(screen.getByRole('switch', { name: 'Summarize on open' }));
    expect(updateSettings).toHaveBeenCalledWith({
      ai: { ...settings.ai, autoSummarizeOnOpen: true },
    });

    const minimum = screen.getByRole('spinbutton', { name: 'Minimum article length' });
    expect((minimum as HTMLInputElement).disabled).toBe(true);
  });

  it('defaults legacy summary visibility to on and preserves other preferences when toggled', async () => {
    send.mockResolvedValue({ success: true, data: { hasApiKey: false } });
    render(<StatefulAiSettings />);
    const toggle = screen.getByRole('switch', { name: 'Show article AI summary' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByRole('switch', { name: 'Summarize on open' }));
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('switch', { name: 'Summarize on open' }).getAttribute('aria-checked')).toBe('true');
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
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
        payload: { apiKey: 'local-secret', provider: 'openai-compatible' },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({ action: 'AI_CONNECTION_TEST' }));
  });


  it('resets endpoint/model and isolates typed keys when switching native providers', async () => {
    send.mockImplementation(async (message: { action: string; payload?: { provider: string } }) => ({
      success: true,
      data: { hasApiKey: message.payload?.provider === 'openai-compatible' },
    }));
    render(<StatefulAiSettings />);
    await waitFor(() => expect(screen.getByText('A key is saved')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'unsaved-previous-key' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Claude' }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({
      action: 'AI_CREDENTIAL_STATUS', payload: { provider: 'anthropic' },
    }));
    expect((screen.getByLabelText('Model') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('API URL') as HTMLInputElement).value).toBe('https://api.anthropic.com/v1');
    expect((screen.getByLabelText('API Key') as HTMLInputElement).value).toBe('');
    await waitFor(() => expect((screen.getByLabelText('API Key') as HTMLInputElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'anthropic-test-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({
      action: 'AI_CREDENTIAL_UPDATE', payload: { apiKey: 'anthropic-test-key', provider: 'anthropic' },
    }));

    fireEvent.click(screen.getByRole('radio', { name: 'Gemini' }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({
      action: 'AI_CREDENTIAL_STATUS', payload: { provider: 'google' },
    }));
    expect((screen.getByLabelText('API URL') as HTMLInputElement).value)
      .toBe('https://generativelanguage.googleapis.com/v1beta');
    expect((screen.getByLabelText('API Key') as HTMLInputElement).value).toBe('');
  });

  it('allows the official native endpoint when no URL override is provided', async () => {
    send.mockResolvedValue({ success: true, data: { hasApiKey: false } });
    render(<AiSection settings={{
      ...settings,
      ai: { ...settings.ai, provider: 'google', apiUrl: '', model: 'native-model' },
    }} updateSettings={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Test connection' }) as HTMLButtonElement).disabled).toBe(false);
  });

});
