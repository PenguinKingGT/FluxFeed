import { useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AiProvider } from '@/lib/types';
import { messageClient } from '@/store/message-client';

/** Keeps typed credentials and presence state isolated to one selected provider. */
export function AiCredentialControls({ provider }: { provider: AiProvider }) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    void messageClient.send<{ hasApiKey: boolean }>({
      action: 'AI_CREDENTIAL_STATUS',
      payload: { provider },
    }).then((response) => {
      if (active) {
        setHasApiKey(Boolean(response.success && response.data?.hasApiKey));
        setHasError(!response.success);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [provider]);

  /** Saves or clears only this provider's key; returned state never contains it. */
  async function persistKey(value: string) {
    setIsSaving(true);
    setHasError(false);
    const response = await messageClient.send<{ hasApiKey: boolean }>({
      action: 'AI_CREDENTIAL_UPDATE',
      payload: { apiKey: value, provider },
    });
    if (response.success) {
      setHasApiKey(Boolean(response.data?.hasApiKey));
      setApiKey('');
    }
    setHasError(!response.success);
    setIsSaving(false);
  }

  return (
    <div className="border-b border-border/70 py-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="ai-api-key">
            {t('settings.aiApiKey')}
          </label>
          <p className="text-xs leading-5 text-muted-foreground">
            {t(provider === 'openai-compatible'
              ? 'settings.aiApiKeyDescription'
              : 'settings.aiNativeKeyDescription')}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          {hasApiKey ? <Check className="size-3.5" /> : <KeyRound className="size-3.5" />}
          {hasApiKey ? t('settings.aiApiKeySaved') : t('settings.aiApiKeyNotSaved')}
        </span>
      </div>
      <div className="flex gap-2 max-[720px]:flex-col">
        <Input
          id="ai-api-key"
          aria-label={t('settings.aiApiKey')}
          className="flex-1"
          type="password"
          autoComplete="off"
          disabled={isLoading || isSaving}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isLoading || isSaving || !apiKey.trim()}
          onClick={() => void persistKey(apiKey)}
        >
          {isSaving ? <Loader2 className="animate-spin" /> : null}
          {t('settings.aiSaveKey')}
        </Button>
        {hasApiKey ? (
          <Button
            aria-label={t('settings.aiClearKey')}
            title={t('settings.aiClearKey')}
            type="button"
            variant="ghost"
            size="icon"
            disabled={isLoading || isSaving}
            onClick={() => void persistKey('')}
          >
            <Trash2 />
          </Button>
        ) : null}
      </div>
      {hasError ? (
        <p role="alert" className="mt-2 text-xs text-destructive">{t('settings.aiKeyFailed')}</p>
      ) : null}
    </div>
  );
}
