import { CheckCheck, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface PopupFooterProps {
  onOpenSettings: () => void;
  onMarkAllRead: () => void;
}

export function PopupFooter({ onOpenSettings, onMarkAllRead }: PopupFooterProps) {
  const { t } = useTranslation();
  return (
    <footer className="mt-auto flex h-15 shrink-0 items-center justify-between border-t border-sidebar-border bg-sidebar/90 px-3 backdrop-blur-xl">
      <Button
        className="rounded-lg text-muted-foreground"
        size="sm"
        variant="ghost"
        onClick={onOpenSettings}
      >
        <Settings data-icon="inline-start" />
        <span className="text-xs font-medium">{t('navigation.settings')}</span>
      </Button>
      <Button
        className="rounded-lg text-muted-foreground"
        size="sm"
        variant="ghost"
        onClick={onMarkAllRead}
      >
        <CheckCheck data-icon="inline-start" />
        <span className="text-xs font-medium">{t('popup.markAllRead')}</span>
      </Button>
    </footer>
  );
}
