import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import fluxFeedIcon from '@/assets/flux-feed.svg';
import { Button } from '@/components/ui/button';

interface PopupHeaderProps {
  onOpenDashboard: () => void;
}

export function PopupHeader({ onOpenDashboard }: PopupHeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="flex h-18 shrink-0 items-center justify-between border-b border-border/80 bg-card/80 px-5 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative">
          <div className="absolute -inset-1 rounded-xl bg-secondary/15 blur-md" />
          <img alt="FluxFeed" className="relative size-9 rounded-[10px] ring-1 ring-border/80" src={fluxFeedIcon} />
        </div>
        <div className="min-w-0">
          <span className="block font-serif text-[22px] leading-6 font-semibold tracking-[-0.035em] text-foreground">FluxFeed</span>
          <span className="block truncate text-[10px] leading-4 font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {t('app.subtitle')}
          </span>
        </div>
      </div>
      <Button
        aria-label={t('popup.openDashboard')}
        className="rounded-full text-muted-foreground"
        size="icon"
        variant="ghost"
        onClick={onOpenDashboard}
      >
        <ExternalLink />
      </Button>
    </header>
  );
}
