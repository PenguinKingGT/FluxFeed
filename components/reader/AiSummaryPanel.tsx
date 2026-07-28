import { useState } from 'react';
import { AlertCircle, ArrowRight, RefreshCw, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { countUnicodeCharacters, isAiConfigured } from '@/lib/ai/ai-preferences';
import { DEFAULT_SETTINGS } from '@/lib/db';
import type { Article, Settings } from '@/lib/types';

const AI_SETUP_PROMPT_DISMISSED_KEY = 'fluxfeed.ai.setupPromptDismissed';

interface AiSummaryPanelProps {
  article: Article;
  contentText: string;
  settings: Settings;
  status: 'idle' | 'loading' | 'success' | 'error';
  stale: boolean;
  summarizeArticle: (
    articleId: string,
    contentText: string,
    options: { force?: boolean; trigger: 'manual' | 'auto' },
  ) => Promise<void>;
}

export function AiSummaryPanel({
  article,
  contentText,
  settings,
  status,
  stale,
  summarizeArticle,
}: AiSummaryPanelProps) {
  const { t } = useTranslation();
  const summary = article.aiSummary;
  const ai = settings.ai ?? DEFAULT_SETTINGS.ai;
  const configured = isAiConfigured(ai);
  const [isSetupPromptDismissed, setIsSetupPromptDismissed] = useState(() => {
    try {
      return localStorage.getItem(AI_SETUP_PROMPT_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const characterCount = countUnicodeCharacters(contentText);
  const belowHardMinimum = characterCount < 80;
  const belowAutoMinimum = ai.autoSummarizeOnOpen
    && ai.autoSummarizeMinCharacters > 0
    && characterCount < ai.autoSummarizeMinCharacters;

  function dismissSetupPrompt() {
    setIsSetupPromptDismissed(true);
    try {
      localStorage.setItem(AI_SETUP_PROMPT_DISMISSED_KEY, 'true');
    } catch {
      // The in-memory dismissal still applies when storage is unavailable.
    }
  }

  if (!configured && isSetupPromptDismissed) {
    return null;
  }

  if (!configured) {
    return (
      <aside className="mb-10 flex items-center justify-between gap-5 rounded-xl border border-border bg-card/72 px-5 py-4 max-[600px]:items-start max-[600px]:flex-col">
        <div>
          <p className="text-sm font-semibold text-foreground">{t('ai.summaryTitle')}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('ai.notConfigured')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => { window.location.hash = '#/settings?section=ai'; }}>
            {t('ai.configure')}
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button aria-label={t('ai.dismissSetupPrompt')} title={t('ai.dismissSetupPrompt')} variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={dismissSetupPrompt}>
            <X />
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="mb-10 overflow-hidden rounded-xl border border-border bg-card/78" aria-label={t('ai.summaryTitle')}>
      <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-4 text-secondary" />
          <h2 className="text-sm font-semibold text-foreground">{t('ai.summaryTitle')}</h2>
        </div>
        {summary ? (
          <Button variant="ghost" size="sm" disabled={status === 'loading'} onClick={() => void summarizeArticle(article.id, contentText, { force: true, trigger: 'manual' })}>
            <RefreshCw />
            {t('ai.regenerate')}
          </Button>
        ) : null}
      </div>

      <div className="px-5 py-5">
        {status === 'loading' ? (
          <div role="status" aria-label={t('ai.generating')} className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">{t('ai.generating')}</p>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[88%]" />
            <Skeleton className="h-3 w-[72%]" />
          </div>
        ) : summary ? (
          <div>
            <p className="font-reading text-[15px] leading-7 text-foreground">{summary.overview}</p>
            {summary.keyPoints.length > 0 ? (
              <ul className="mt-5 grid gap-3">
                {summary.keyPoints.map((point) => (
                  <li key={point} className="grid grid-cols-[5px_1fr] gap-3 text-sm leading-6 text-foreground">
                    <span className="mt-2.5 size-1 rounded-full bg-secondary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>{t('ai.generatedWith', { model: summary.model })}</span>
              <span>{t('ai.mayBeInaccurate')}</span>
              {stale ? <span className="text-secondary">{t('ai.settingsChanged')}</span> : null}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-6 max-[600px]:items-start max-[600px]:flex-col">
            <div>
              {belowHardMinimum ? (
                <p className="text-sm text-muted-foreground">{t('ai.contentTooShort')}</p>
              ) : belowAutoMinimum ? (
                <p className="text-sm text-muted-foreground">{t('ai.belowAutoThreshold', { count: characterCount, minimum: ai.autoSummarizeMinCharacters })}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t('settings.aiPrivacy')}</p>
              )}
              {status === 'error' ? (
                <p role="alert" className="mt-2 flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="size-3.5" />
                  {t('ai.error')}
                </p>
              ) : null}
            </div>
            <Button className="shrink-0" disabled={belowHardMinimum} onClick={() => void summarizeArticle(article.id, contentText, { trigger: 'manual' })}>
              <Sparkles />
              {t('ai.generate')}
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
