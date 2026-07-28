import { Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from './SectionHeader';

export function ShortcutsSection() {
  const { t } = useTranslation();
  const shortcuts = [
    { action: t('settings.nextPrevious'), keys: ['J', 'K'] },
    { action: t('settings.markRead'), keys: ['M'] },
    { action: t('settings.openBackground'), keys: ['V'] },
    { action: t('settings.starUnstar'), keys: ['S'] },
  ];
  return (
    <section id="shortcuts" className="scroll-mt-6 overflow-hidden rounded-2xl border border-border bg-card/88 shadow-[0_16px_50px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
      <SectionHeader icon={<Keyboard className="size-4" />} label={t('settings.shortcuts')} />
      <div className="grid grid-cols-2 gap-x-8 px-6 py-4">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.action} className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-b-0">
            <span className="text-xs leading-5 text-muted-foreground">{shortcut.action}</span>
            <div className="flex gap-1">
              {shortcut.keys.map((key) => (
                <kbd key={key} className="min-w-6 rounded-md border border-border bg-accent px-1.5 py-1 text-center font-mono text-[10px] font-bold text-accent-foreground shadow-[inset_0_-1px_color-mix(in_srgb,var(--foreground)_12%,transparent)]">
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
