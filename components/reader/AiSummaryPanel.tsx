import { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, RefreshCw, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { planArticleSummary } from '@/lib/ai/article-chunker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    options: { allowPartial?: boolean; force?: boolean; trigger: 'manual' | 'auto' },
  ) => Promise<void>;
}

/** Displays cached summaries and requires explicit consent for partial processing. */
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
  const plan = useMemo(() => planArticleSummary(contentText), [contentText]);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    articleId: string;
    contentText: string;
    force: boolean;
  } | null>(null);
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

  let emptyNotice: string | undefined;
  if (belowHardMinimum) {
    emptyNotice = t('ai.contentTooShort');
  } else if (belowAutoMinimum) {
    emptyNotice = t('ai.belowAutoThreshold', {
      count: characterCount,
      minimum: ai.autoSummarizeMinCharacters,
    });
  }
  const showDetails = Boolean(
    summary
    || status === 'loading'
    || status === 'error'
    || plan.chunks.length > 1
    || plan.isPartial
    || emptyNotice,
  );

  /** Captures the exact article and text so consent cannot carry to another article. */
  function requestSummary(force = false) {
    if (plan.isPartial) {
      setPendingConfirmation({ articleId: article.id, contentText, force });
      return;
    }
    void summarizeArticle(article.id, contentText, {
      trigger: 'manual',
      ...(force ? { force: true } : {}),
    });
  }

  /** Submits only after the user accepts the displayed partial-processing scope. */
  function confirmPartialSummary() {
    if (
      !pendingConfirmation
      || pendingConfirmation.articleId !== article.id
      || pendingConfirmation.contentText !== contentText
    ) {
      setPendingConfirmation(null);
      return;
    }
    void summarizeArticle(article.id, contentText, {
      trigger: 'manual',
      allowPartial: true,
      ...(pendingConfirmation.force ? { force: true } : {}),
    });
    setPendingConfirmation(null);
  }

  /** Persists dismissal of the optional AI setup suggestion. */
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
      <aside className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-border bg-card/72 px-4 py-2.5">
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
    <aside className="mb-5 overflow-hidden rounded-lg border border-border bg-card/78" aria-label={t('ai.summaryTitle')}>
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-4 text-secondary" />
          <h2 className="text-sm font-semibold text-foreground">{t('ai.summaryTitle')}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={status === 'loading' || (!summary && belowHardMinimum)}
          onClick={() => requestSummary(Boolean(summary))}
        >
          {summary ? <RefreshCw /> : <Sparkles />}
          {t(summary ? 'ai.regenerate' : 'ai.generate')}
        </Button>
      </div>

      <Dialog
        open={pendingConfirmation?.articleId === article.id
          && pendingConfirmation?.contentText === contentText}
        onOpenChange={(open) => !open && setPendingConfirmation(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ai.partialTitle')}</DialogTitle>
            <DialogDescription>{t('ai.partialDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingConfirmation(null)}>
              {t('dialog.cancel')}
            </Button>
            <Button onClick={confirmPartialSummary}>{t('ai.partialConfirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty summaries stay a single row; expand only for content or useful feedback. */}
      {showDetails ? (
        <div className="border-t border-border/60 px-4 py-3">
          {plan.chunks.length > 1 && status !== 'loading' ? (
            <p className="mb-2 text-xs text-muted-foreground">
              {t('ai.chunkRequests', { count: plan.estimatedRequests })}
            </p>
          ) : null}
          {plan.isPartial && !summary ? (
            <p className="mb-2 text-xs text-muted-foreground">{t('ai.partialDescription')}</p>
          ) : null}
          {summary?.isPartial ? (
            <p className="mb-2 text-xs text-muted-foreground">{t('ai.partialSummary')}</p>
          ) : null}
          {status === 'error' ? (
            <p role="alert" className="mb-2 flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="size-3.5" />
              {t('ai.error')}
            </p>
          ) : null}
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
                <ul className="mt-3 grid gap-2">
                  {summary.keyPoints.map((point) => (
                    <li key={point} className="grid grid-cols-[5px_1fr] gap-3 text-sm leading-6 text-foreground">
                      <span className="mt-2.5 size-1 rounded-full bg-secondary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{t('ai.generatedWith', { model: summary.model })}</span>
                <span>{t('ai.mayBeInaccurate')}</span>
                {stale ? <span className="text-secondary">{t('ai.settingsChanged')}</span> : null}
              </div>
            </div>
          ) : emptyNotice ? (
            <p className="text-xs text-muted-foreground">{emptyNotice}</p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
