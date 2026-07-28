import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Settings } from '@/lib/types';
import { SectionHeader } from './SectionHeader';
import { SettingRow } from './SettingRow';
import { SettingsToggle } from './SettingsToggle';

interface GeneralSectionProps {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void> | void;
}

export function GeneralSection({ settings, updateSettings }: GeneralSectionProps) {
  const { t } = useTranslation();
  return (
    <section id="general" className="scroll-mt-6 overflow-hidden rounded-2xl border border-border bg-card/88 shadow-[0_16px_50px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
      <SectionHeader icon={<SlidersHorizontal className="size-4" />} label={t('settings.general')} />
      <div className="px-6">
        <SettingRow label={t('settings.refreshInterval')} description={t('settings.refreshDescription')}>
          <div className="flex items-center gap-2">
            <input
              aria-label={t('settings.refreshInterval')}
              type="number"
              min={5}
              max={1440}
              step={5}
              value={settings.refreshInterval}
              className="h-9 w-20 rounded-lg border border-input bg-background px-3 text-sm text-foreground tabular-nums outline-none focus:border-ring focus:ring-3 focus:ring-ring/15"
              onChange={(event) => void updateSettings({ refreshInterval: Number(event.target.value) })}
            />
            <span className="text-xs text-muted-foreground">{t('settings.minutes')}</span>
          </div>
        </SettingRow>
        <SettingRow label={t('settings.autoRead')} description={t('settings.autoReadDescription')}>
          <SettingsToggle checked={settings.markReadOnOpen} label={t('settings.autoRead')} onCheckedChange={(checked) => void updateSettings({ markReadOnOpen: checked })} />
        </SettingRow>
        <SettingRow label={t('settings.unreadOnly')} description={t('settings.unreadOnlyDescription')}>
          <SettingsToggle checked={settings.showUnreadOnly} label={t('settings.unreadOnly')} onCheckedChange={(checked) => void updateSettings({ showUnreadOnly: checked })} />
        </SettingRow>
        <SettingRow label={t('settings.maxArticles')} description={t('settings.maxArticlesDescription')}>
          <input
            aria-label={t('settings.maxArticles')}
            type="number"
            min={20}
            max={5000}
            step={20}
            value={settings.maxArticlesPerFeed}
            className="h-9 w-24 rounded-lg border border-input bg-background px-3 text-sm text-foreground tabular-nums outline-none focus:border-ring focus:ring-3 focus:ring-ring/15"
            onChange={(event) => void updateSettings({ maxArticlesPerFeed: Number(event.target.value) })}
          />
        </SettingRow>
        <SettingRow label={t('settings.retention')} description={t('settings.retentionDescription')}>
          <select
            aria-label={t('settings.retention')}
            value={String(settings.retentionDays)}
            className="h-9 min-w-35 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/15"
            onChange={(event) => void updateSettings({ retentionDays: Number(event.target.value) })}
          >
            <option value="7">{t('settings.days', { count: 7 })}</option>
            <option value="30">{t('settings.days', { count: 30 })}</option>
            <option value="90">{t('settings.days', { count: 90 })}</option>
            <option value="365">{t('settings.oneYear')}</option>
            <option value="0">{t('settings.forever')}</option>
          </select>
        </SettingRow>
      </div>
    </section>
  );
}
