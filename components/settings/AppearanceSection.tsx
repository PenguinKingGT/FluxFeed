import { Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FONT_FAMILIES, INTERFACE_FONTS, READING_FONTS } from '@/lib/settings/font-preferences';
import { getReadingFontSize, READING_FONT_SIZE_PX } from '@/lib/settings/reading-font-size';
import { COLOR_THEMES } from '@/lib/theme/theme-presets';
import type { ColorTheme, InterfaceFont, ReadingFont, Settings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SectionHeader } from './SectionHeader';
import { SettingRow } from './SettingRow';

interface AppearanceSectionProps {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void> | void;
}

const appearanceModes: Settings['theme'][] = ['system', 'light', 'dark'];
const fontSizes: Settings['fontSize'][] = ['small', 'medium', 'large'];
type FontPreference = ReadingFont | InterfaceFont;

const themeSwatchClasses: Record<ColorTheme, string> = {
  white: 'bg-white data-checked:bg-white dark:bg-white dark:data-checked:bg-white',
  sky: 'bg-[#8bc9f5] data-checked:bg-[#8bc9f5] dark:bg-[#8bc9f5] dark:data-checked:bg-[#8bc9f5]',
  mint: 'bg-[#8bd5b4] data-checked:bg-[#8bd5b4] dark:bg-[#8bd5b4] dark:data-checked:bg-[#8bd5b4]',
  peach: 'bg-[#f4b38b] data-checked:bg-[#f4b38b] dark:bg-[#f4b38b] dark:data-checked:bg-[#f4b38b]',
  'quiet-signal': 'bg-[#ebe7de] data-checked:bg-[#ebe7de] dark:bg-[#ebe7de] dark:data-checked:bg-[#ebe7de]',
  graphite: 'bg-[#b8c9da] data-checked:bg-[#b8c9da] dark:bg-[#b8c9da] dark:data-checked:bg-[#b8c9da]',
  forest: 'bg-[#adc6af] data-checked:bg-[#adc6af] dark:bg-[#adc6af] dark:data-checked:bg-[#adc6af]',
};

interface FontChoiceGroupProps {
  scope: 'reading' | 'interface';
  label: string;
  value: FontPreference;
  options: FontPreference[];
  onValueChange: (value: string) => void;
}

/** Offers font names in their own typeface without separate preview cards. */
function FontChoiceGroup({ scope, label, value, options, onValueChange }: FontChoiceGroupProps) {
  const { t } = useTranslation();
  const labelId = `font-choice-${label.replaceAll(/\s/g, '-').toLowerCase()}`;
  const fontLabels: Record<FontPreference, string> = {
    'system-serif': t('settings.fontClassicReading'),
    'system-sans': t(scope === 'interface' ? 'settings.fontSystemDefault' : 'settings.fontModernReading'),
    'lxgw-wenkai': t('settings.fontLxgwWenkai'),
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border/70 py-4">
      <h3 id={labelId} className="text-sm font-semibold text-foreground">{label}</h3>
      <RadioGroup
        aria-labelledby={labelId}
        className="flex w-auto min-w-0 flex-wrap gap-x-4 gap-y-1"
        value={value}
        onValueChange={onValueChange}
      >
        {options.map((font) => (
          <label
            key={font}
            className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 transition-colors hover:bg-muted"
          >
            <RadioGroupItem aria-label={fontLabels[font]} value={font} />
            <span
              className="text-sm text-foreground"
              style={{ fontFamily: FONT_FAMILIES[font] }}
            >
              {fontLabels[font]}
            </span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

/** Configures palette, display mode, language, and independent reading preferences. */
export function AppearanceSection({ settings, updateSettings }: AppearanceSectionProps) {
  const { t } = useTranslation();
  const fontSizePx = getReadingFontSize(settings.fontSize);
  const themeLabels: Record<Settings['theme'], string> = {
    system: t('settings.themeSystem'),
    light: t('settings.themeLight'),
    dark: t('settings.themeDark'),
  };
  const colorThemeLabels: Record<ColorTheme, string> = {
    white: t('settings.themeWhite'),
    sky: t('settings.themeSky'),
    mint: t('settings.themeMint'),
    peach: t('settings.themePeach'),
    'quiet-signal': t('settings.themeQuietSignal'),
    graphite: t('settings.themeGraphite'),
    forest: t('settings.themeForest'),
  };

  return (
    <section id="appearance" className="scroll-mt-6 overflow-hidden rounded-2xl border border-border bg-card/88 shadow-[0_16px_50px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
      <SectionHeader icon={<Palette className="size-4" />} label={t('settings.appearance')} />
      <div className="flex flex-col gap-7 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border/70 pb-5">
          <span className="text-sm font-semibold text-foreground">{t('settings.colorTheme')}</span>
          <RadioGroup
            aria-label={t('settings.colorTheme')}
            className="flex w-auto min-w-0 flex-wrap gap-x-3 gap-y-1"
            value={settings.colorTheme}
            onValueChange={(colorTheme) => void updateSettings({ colorTheme: colorTheme as ColorTheme })}
          >
            {COLOR_THEMES.map((colorTheme) => {
              const active = settings.colorTheme === colorTheme;
              return (
                <label
                  key={colorTheme}
                  className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2 transition-colors hover:bg-muted"
                >
                  <RadioGroupItem
                    aria-label={colorThemeLabels[colorTheme]}
                    value={colorTheme}
                    className={cn(
                      'size-5 border-black/15 data-checked:border-black/15 [&_[data-slot=radio-group-indicator]]:hidden',
                      themeSwatchClasses[colorTheme],
                      active && 'ring-2 ring-ring ring-offset-2 ring-offset-card',
                    )}
                  />
                  <span className={cn('text-sm', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                    {colorThemeLabels[colorTheme]}
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        </div>

        <SettingRow label={t('settings.appearanceMode')} description={t('settings.appearanceModeDescription')}>
          <ToggleGroup
            aria-label={t('settings.appearanceMode')}
            type="single"
            variant="outline"
            spacing={0}
            value={settings.theme}
            onValueChange={(theme) => {
              if (theme) void updateSettings({ theme: theme as Settings['theme'] });
            }}
          >
            {appearanceModes.map((theme) => (
              <ToggleGroupItem key={theme} value={theme} aria-label={themeLabels[theme]} className="h-9 px-3">
                {themeLabels[theme]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </SettingRow>
        <SettingRow label={t('settings.language')} description={t('settings.languageDescription')}>
          <Select value={settings.language} onValueChange={(language) => void updateSettings({ language: language as Settings['language'] })}>
            <SelectTrigger aria-label={t('settings.language')} className="min-w-40 bg-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="en">{t('settings.languageEnglish')}</SelectItem>
                <SelectItem value="zh-CN">{t('settings.languageChinese')}</SelectItem>
                <SelectItem value="ja">{t('settings.languageJapanese')}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingRow>
        <div>
          <FontChoiceGroup
            scope="reading"
            label={t('settings.readingFont')}
            value={settings.readingFont}
            options={READING_FONTS}
            onValueChange={(readingFont) => void updateSettings({ readingFont: readingFont as ReadingFont })}
          />
          <FontChoiceGroup
            scope="interface"
            label={t('settings.interfaceFont')}
            value={settings.interfaceFont}
            options={INTERFACE_FONTS}
            onValueChange={(interfaceFont) => void updateSettings({ interfaceFont: interfaceFont as InterfaceFont })}
          />
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
            <h3 id="reading-font-size-label" className="text-sm font-semibold text-foreground">
              {t('settings.readingFontSize')}
            </h3>
            <ToggleGroup
              aria-labelledby="reading-font-size-label"
              type="single"
              variant="outline"
              spacing={0}
              value={settings.fontSize}
              onValueChange={(fontSize) => {
                if (fontSize) {
                  void updateSettings({ fontSize: fontSize as Settings['fontSize'] });
                }
              }}
            >
              {fontSizes.map((fontSize) => (
                <ToggleGroupItem
                  key={fontSize}
                  value={fontSize}
                  aria-label={`${t(`settings.${fontSize === 'medium' ? 'default' : fontSize}`)} ${READING_FONT_SIZE_PX[fontSize]}px`}
                  className="h-9 gap-2 px-3"
                >
                  <span>{t(`settings.${fontSize === 'medium' ? 'default' : fontSize}`)}</span>
                  <span className="text-[10px] font-normal text-muted-foreground tabular-nums">
                    {READING_FONT_SIZE_PX[fontSize]}px
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <p
            aria-live="polite"
            className="border-t border-border/70 pt-4 leading-relaxed text-foreground"
            style={{ fontFamily: FONT_FAMILIES[settings.readingFont], fontSize: `${fontSizePx}px` }}
          >
            {t('settings.fontPreviewText')}
          </p>
        </div>
      </div>
    </section>
  );
}
