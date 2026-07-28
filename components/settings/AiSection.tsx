import { useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AiPreferences, Settings } from '@/lib/types';
import { messageClient } from '@/store/message-client';
import { SectionHeader } from './SectionHeader';
import { SettingRow } from './SettingRow';
import { SettingsToggle } from './SettingsToggle';

interface AiSectionProps {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void> | void;
}

export function AiSection({ settings, updateSettings }: AiSectionProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [testState, setTestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const ai = settings.ai;

  useEffect(() => {
    let active = true;
    void messageClient.send<{ hasApiKey: boolean }>({ action: 'AI_CREDENTIAL_STATUS' }).then((response) => {
      if (active && response.success) setHasApiKey(Boolean(response.data?.hasApiKey));
    });
    return () => {
      active = false;
    };
  }, []);

  function updateAi(patch: Partial<AiPreferences>) {
    void updateSettings({ ai: { ...ai, ...patch } });
  }

  async function saveApiKey() {
    setIsSavingKey(true);
    const response = await messageClient.send<{ hasApiKey: boolean }>({
      action: 'AI_CREDENTIAL_UPDATE',
      payload: { apiKey },
    });
    if (response.success) {
      setHasApiKey(Boolean(response.data?.hasApiKey));
      setApiKey('');
    }
    setIsSavingKey(false);
  }

  async function clearApiKey() {
    setIsSavingKey(true);
    const response = await messageClient.send<{ hasApiKey: boolean }>({
      action: 'AI_CREDENTIAL_UPDATE',
      payload: { apiKey: '' },
    });
    if (response.success) {
      setHasApiKey(false);
      setApiKey('');
    }
    setIsSavingKey(false);
  }

  async function testConnection() {
    setTestState('loading');
    const response = await messageClient.send({ action: 'AI_CONNECTION_TEST' });
    setTestState(response.success ? 'success' : 'error');
  }

  return (
    <section id="ai" className="scroll-mt-6 overflow-hidden rounded-2xl border border-border bg-card/88 shadow-[0_16px_50px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
      <SectionHeader icon={<Sparkles className="size-4" />} label={t('settings.ai')} />
      <div className="px-6">
        <div className="border-b border-border/70 py-5">
          <label className="mb-1 block text-sm font-semibold text-foreground" htmlFor="ai-api-url">{t('settings.aiApiUrl')}</label>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">{t('settings.aiApiUrlDescription')}</p>
          <Input id="ai-api-url" aria-label={t('settings.aiApiUrl')} className="h-10 bg-background" placeholder="https://example.com/v1/chat/completions" value={ai.apiUrl} onChange={(event) => updateAi({ apiUrl: event.target.value })} />
        </div>

        <div className="border-b border-border/70 py-5">
          <label className="mb-1 block text-sm font-semibold text-foreground" htmlFor="ai-model">{t('settings.aiModel')}</label>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">{t('settings.aiModelDescription')}</p>
          <Input id="ai-model" aria-label={t('settings.aiModel')} className="h-10 bg-background" placeholder="model-name" value={ai.model} onChange={(event) => updateAi({ model: event.target.value })} />
        </div>

        <div className="border-b border-border/70 py-5">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground" htmlFor="ai-api-key">{t('settings.aiApiKey')}</label>
              <p className="text-xs leading-5 text-muted-foreground">{t('settings.aiApiKeyDescription')}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              {hasApiKey ? <Check className="size-3.5 text-secondary" /> : <KeyRound className="size-3.5" />}
              {hasApiKey ? t('settings.aiApiKeySaved') : t('settings.aiApiKeyNotSaved')}
            </span>
          </div>
          <div className="flex gap-2 max-[720px]:flex-col">
            <Input id="ai-api-key" aria-label={t('settings.aiApiKey')} className="h-10 flex-1 bg-background" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
            <Button type="button" variant="outline" disabled={isSavingKey || !apiKey.trim()} onClick={() => void saveApiKey()}>
              {isSavingKey ? <Loader2 className="animate-spin" /> : null}
              {t('settings.aiSaveKey')}
            </Button>
            {hasApiKey ? (
              <Button aria-label={t('settings.aiClearKey')} title={t('settings.aiClearKey')} type="button" variant="ghost" size="icon" disabled={isSavingKey} onClick={() => void clearApiKey()}>
                <Trash2 />
              </Button>
            ) : null}
          </div>
        </div>

        <SettingRow label={t('settings.aiSummaryLanguage')} description={t('settings.aiDescription')}>
          <select aria-label={t('settings.aiSummaryLanguage')} value={ai.summaryLanguage} className="h-9 min-w-40 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/15" onChange={(event) => updateAi({ summaryLanguage: event.target.value as AiPreferences['summaryLanguage'] })}>
            <option value="auto">{t('settings.aiFollowArticle')}</option>
            <option value="zh-CN">{t('settings.languageChinese')}</option>
            <option value="en">{t('settings.languageEnglish')}</option>
            <option value="ja">{t('settings.languageJapanese')}</option>
          </select>
        </SettingRow>

        <SettingRow label={t('settings.aiSummaryLength')} description={t('settings.aiDescription')}>
          <select aria-label={t('settings.aiSummaryLength')} value={ai.summaryLength} className="h-9 min-w-40 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/15" onChange={(event) => updateAi({ summaryLength: event.target.value as AiPreferences['summaryLength'] })}>
            <option value="brief">{t('settings.aiLengthBrief')}</option>
            <option value="standard">{t('settings.aiLengthStandard')}</option>
            <option value="detailed">{t('settings.aiLengthDetailed')}</option>
          </select>
        </SettingRow>

        <div className="border-b border-border/70 py-5">
          <label className="mb-1 block text-sm font-semibold text-foreground" htmlFor="ai-instructions">{t('settings.aiInstructions')}</label>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">{t('settings.aiInstructionsDescription')}</p>
          <Textarea id="ai-instructions" aria-label={t('settings.aiInstructions')} maxLength={2000} className="min-h-24 bg-background" value={ai.customInstructions} onChange={(event) => updateAi({ customInstructions: event.target.value })} />
        </div>

        <SettingRow label={t('settings.aiDigestLimit')} description={t('settings.aiDigestLimitDescription')}>
          <select aria-label={t('settings.aiDigestLimit')} value={ai.dailyDigestMaxArticles} className="h-9 min-w-28 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/15" onChange={(event) => updateAi({ dailyDigestMaxArticles: Number(event.target.value) as 50 | 100 | 200 })}>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </SettingRow>

        <SettingRow label={t('settings.aiAutoSummary')} description={t('settings.aiAutoSummaryDescription')}>
          <SettingsToggle checked={ai.autoSummarizeOnOpen} label={t('settings.aiAutoSummary')} onCheckedChange={(checked) => updateAi({ autoSummarizeOnOpen: checked })} />
        </SettingRow>

        <SettingRow label={t('settings.aiAutoMinimum')} description={t('settings.aiAutoMinimumDescription')}>
          <div className="flex items-center gap-2">
            <Input aria-label={t('settings.aiAutoMinimum')} className="h-9 w-28 bg-background tabular-nums" type="number" min={0} max={50000} step={100} disabled={!ai.autoSummarizeOnOpen} value={ai.autoSummarizeMinCharacters} onChange={(event) => updateAi({ autoSummarizeMinCharacters: Number(event.target.value) })} />
            <span className="text-xs text-muted-foreground">{t('settings.characters')}</span>
          </div>
        </SettingRow>

        <div className="flex items-center justify-between gap-4 py-5 max-[720px]:items-start max-[720px]:flex-col">
          <p className="max-w-lg text-xs leading-5 text-muted-foreground">{t('settings.aiPrivacy')}</p>
          <div className="flex shrink-0 items-center gap-3">
            {testState === 'success' ? <span role="status" className="text-xs text-secondary">{t('settings.aiTestSuccess')}</span> : null}
            {testState === 'error' ? <span role="alert" className="text-xs text-destructive">{t('settings.aiTestFailed')}</span> : null}
            <Button type="button" variant="outline" disabled={testState === 'loading' || !ai.apiUrl.trim() || !ai.model.trim()} onClick={() => void testConnection()}>
              {testState === 'loading' ? <Loader2 className="animate-spin" /> : null}
              {testState === 'loading' ? t('settings.aiTesting') : t('settings.aiTest')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
