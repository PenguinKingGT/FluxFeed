import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { isAiConfigured } from '@/lib/ai/ai-preferences';
import { AI_PROVIDERS, AI_PROVIDER_BASE_URLS, normalizeAiProvider } from '@/lib/ai/provider-settings';
import { AiCredentialControls } from './AiCredentialControls';
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

/** Configures one active provider without exposing saved credentials. */
export function AiSection({ settings, updateSettings }: AiSectionProps) {
  const { t } = useTranslation();
  const [testState, setTestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const ai = settings.ai;

  const provider = normalizeAiProvider(ai.provider);
  const configuration = JSON.stringify([provider, ai.apiUrl, ai.model]);
  const [testedConfiguration, setTestedConfiguration] = useState('');
  const visibleTestState = testedConfiguration === configuration ? testState : 'idle';

  /** Keeps preferences in the ordinary settings channel, separate from credentials. */
  function updateAi(patch: Partial<AiPreferences>) {
    void updateSettings({ ai: { ...ai, ...patch } });
  }

  /** Resets endpoint/model so a previous provider's configuration is never reused silently. */
  function changeProvider(value: string) {
    if (!value || value === provider) {
      return;
    }
    const selected = normalizeAiProvider(value);
    updateAi({ provider: selected, apiUrl: AI_PROVIDER_BASE_URLS[selected], model: '' });
  }

  /** Associates the response with the exact configuration that was tested. */
  async function testConnection() {
    setTestedConfiguration(configuration);
    setTestState('loading');
    const response = await messageClient.send({ action: 'AI_CONNECTION_TEST' });
    setTestState(response.success ? 'success' : 'error');
  }

  return (
    <section id="ai" className="scroll-mt-6 overflow-hidden rounded-2xl border border-border bg-card/88 shadow-[0_16px_50px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
      <SectionHeader icon={<Sparkles className="size-4" />} label={t('settings.ai')} />
      <div className="px-6">
        <div className="flex flex-col gap-3 border-b border-border/70 py-5">
          <p className="text-sm font-semibold">{t('settings.aiProvider')}</p>
          <p className="text-xs leading-5 text-muted-foreground">
            {t('settings.aiProviderDescription')}
          </p>
          <ToggleGroup
            type="single"
            role="radiogroup"
            variant="outline"
            aria-label={t('settings.aiProvider')}
            value={provider}
            disabled={testState === 'loading'}
            className="flex-wrap"
            onValueChange={changeProvider}
          >
            {AI_PROVIDERS.map((value) => (
              <ToggleGroupItem key={value} value={value}>
                {t(`settings.aiProvider.${value}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="border-b border-border/70 py-5">
          <label className="mb-1 block text-sm font-semibold text-foreground" htmlFor="ai-api-url">{t('settings.aiApiUrl')}</label>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">
            {t(provider === 'openai-compatible'
              ? 'settings.aiApiUrlDescription'
              : 'settings.aiNativeUrlDescription')}
          </p>
          <Input
            id="ai-api-url"
            aria-label={t('settings.aiApiUrl')}
            className="h-10"
            placeholder={AI_PROVIDER_BASE_URLS[provider] || 'https://example.com/v1/chat/completions'}
            value={ai.apiUrl}
            onChange={(event) => updateAi({ apiUrl: event.target.value })}
          />
        </div>

        <div className="border-b border-border/70 py-5">
          <label className="mb-1 block text-sm font-semibold text-foreground" htmlFor="ai-model">{t('settings.aiModel')}</label>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">{t('settings.aiModelDescription')}</p>
          <Input
            id="ai-model"
            aria-label={t('settings.aiModel')}
            className="h-10"
            placeholder="model-name"
            value={ai.model}
            onChange={(event) => updateAi({ model: event.target.value })}
          />
        </div>

        <AiCredentialControls key={provider} provider={provider} />

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
          <Textarea
            id="ai-instructions"
            aria-label={t('settings.aiInstructions')}
            maxLength={2000}
            className="min-h-24"
            value={ai.customInstructions}
            onChange={(event) => updateAi({ customInstructions: event.target.value })}
          />
        </div>

        <SettingRow label={t('settings.aiDigestLimit')} description={t('settings.aiDigestLimitDescription')}>
          <select aria-label={t('settings.aiDigestLimit')} value={ai.dailyDigestMaxArticles} className="h-9 min-w-28 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/15" onChange={(event) => updateAi({ dailyDigestMaxArticles: Number(event.target.value) as 50 | 100 | 200 })}>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </SettingRow>

        <SettingRow label={t('settings.aiShowSummary')} description={t('settings.aiShowSummaryDescription')}>
          <SettingsToggle
            checked={ai.showArticleSummary !== false}
            label={t('settings.aiShowSummary')}
            onCheckedChange={(checked) => updateAi({ showArticleSummary: checked })}
          />
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
            {visibleTestState === 'success' ? <span role="status" className="text-xs text-secondary">{t('settings.aiTestSuccess')}</span> : null}
            {visibleTestState === 'error' ? <span role="alert" className="text-xs text-destructive">{t('settings.aiTestFailed')}</span> : null}
            <Button
              type="button"
              variant="outline"
              disabled={testState === 'loading' || !isAiConfigured(ai)}
              onClick={() => void testConnection()}
            >
              {testState === 'loading' ? <Loader2 className="animate-spin" /> : null}
              {testState === 'loading' ? t('settings.aiTesting') : t('settings.aiTest')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
