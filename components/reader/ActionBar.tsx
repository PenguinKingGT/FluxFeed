import { CheckCheck, ExternalLink, Maximize2, Minimize2, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  isStarred: boolean;
  onOpenOriginal: () => void;
  onToggleStar: () => void;
  onMarkRead: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export function ActionBar({ isStarred, onOpenOriginal, onToggleStar, onMarkRead, isFocusMode, onToggleFocusMode }: ActionBarProps) {
  const { t } = useTranslation();
  const focusModeLabel = isFocusMode ? t('reader.exitFocusMode') : t('reader.enterFocusMode');

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-card/80 p-0.5">
          <Button aria-label={t('reader.starArticle')} title={t('reader.starArticle')} variant="ghost" size="icon-sm" className={cn('rounded-md', isStarred ? 'text-secondary' : 'text-muted-foreground')} onClick={onToggleStar}>
            <Star className={cn(isStarred && 'fill-current')} />
          </Button>
          <Button aria-label={t('reader.markRead')} title={t('reader.markRead')} variant="ghost" size="icon-sm" className="rounded-md text-muted-foreground" onClick={onMarkRead}>
            <CheckCheck />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button aria-label={focusModeLabel} variant="ghost" size="icon-sm" className={cn('rounded-md', isFocusMode ? 'bg-accent text-foreground' : 'text-muted-foreground')} onClick={onToggleFocusMode}>
                {isFocusMode ? <Minimize2 /> : <Maximize2 />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{focusModeLabel} · F</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Button aria-label={t('reader.original')} title={t('reader.original')} className="rounded-lg" size="sm" onClick={onOpenOriginal}>
          <ExternalLink data-icon="inline-end" />
          <span className="reader-original-label">{t('reader.original')}</span>
        </Button>
      </div>
    </TooltipProvider>
  );
}
