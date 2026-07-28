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

const themePreviewColors: Record<ColorTheme, {
  light: { background: string; sidebar: string; surface: string; text: string; accent: string };
  dark: { background: string; sidebar: string; surface: string; text: string; accent: string };
}> = {
  'quiet-signal': {
    light: { background: '#f6f3ec', sidebar: '#ebe7de', surface: '#fbfaf6', text: '#1c1d1a', accent: '#e7a63b' },
    dark: { background: '#111513', sidebar: '#151a17', surface: '#171c19', text: '#ebe9e1', accent: '#d89a38' },
  },
  graphite: {
    light: { background: '#f3f5f7', sidebar: '#e8ecf0', surface: '#fafbfc', text: '#1b2229', accent: '#3f6fa5' },
    dark: { background: '#12171c', sidebar: '#151b21', surface: '#181e24', text: '#e8edf2', accent: '#76a3d2' },
  },
  forest: {
    light: { background: '#f2f5ef', sidebar: '#e7ede5', surface: '#fafbf7', text: '#19231c', accent: '#4f7758' },
    dark: { background: '#101713', sidebar: '#141b16', surface: '#171f19', text: '#e5ede4', accent: '#82ab88' },
  },
};

function ThemePalettePreview({ colorTheme }: { colorTheme: ColorTheme }) {
  return (
    <div className="grid h-14 w-full grid-cols-2 overflow-hidden rounded-lg border border-border/80">
      {(['light', 'dark'] as const).map((mode) => {
        const colors = themePreviewColors[colorTheme][mode];
        return (
          <div
            key={mode}
            aria-hidden="true"
            className="grid grid-cols-[0.34fr_1fr] gap-1 p-1.5"
            style={{ backgroundColor: colors.background }}
          >
            <span className="rounded-sm" style={{ backgroundColor: colors.sidebar }} />
            <span className="flex flex-col justify-between rounded-sm p-1.5" style={{ backgroundColor: colors.surface }}>
              <span className="h-1 w-4/5 rounded-full opacity-75" style={{ backgroundColor: colors.text }} />
              <span className="h-1 w-3/5 rounded-full opacity-40" style={{ backgroundColor: colors.text }} />
              <span className="h-1.5 w-5 rounded-full" style={{ backgroundColor: colors.accent }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface FontChoiceGroupProps {
  scope: 'reading' | 'interface';
  label: string;
  description: string;
  value: FontPreference;
  options: FontPreference[];
  onValueChange: (value: string) => void;
}

function FontChoiceGroup({ scope, label, description, value, options, onValueChange }: FontChoiceGroupProps) {
  const { t } = useTranslation();
  const labelId = `font-choice-${label.replaceAll(/\s/g, '-').toLowerCase()}`;
  const fontLabels: Record<FontPreference, string> = {
    'system-serif': t('settings.fontClassicReading'),
    'system-sans': t(scope === 'interface' ? 'settings.fontSystemDefault' : 'settings.fontModernReading'),
    'lxgw-wenkai': t('settings.fontLxgwWenkai'),
  };
  const fontDescriptions: Record<FontPreference, string> = {
    'system-serif': t('settings.fontClassicReadingDescription'),
    'system-sans': t(scope === 'interface' ? 'settings.fontSystemDefaultDescription' : 'settings.fontModernReadingDescription'),
    'lxgw-wenkai': t('settings.fontLxgwWenkaiDescription'),
  };

  return (
    <div>
      <h3 id={labelId} className="text-sm font-semibold text-foreground">{label}</h3>
      <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{description}</p>
      <RadioGroup
        aria-labelledby={labelId}
        className={cn('mt-4 grid gap-3', options.length === 3 ? 'grid-cols-3 max-[720px]:grid-cols-1' : 'grid-cols-2 max-[620px]:grid-cols-1')}
        value={value}
        onValueChange={onValueChange}
      >
        {options.map((font) => {
          const active = value === font;
          return (
            <label
              key={font}
              className={cn(
                'relative flex min-h-32 cursor-pointer flex-col rounded-xl border bg-muted/45 p-4 transition-colors',
                active
                  ? 'border-secondary bg-secondary/8 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--secondary)_40%,transparent)]'
                  : 'border-border hover:bg-muted/80',
              )}
            >
              <RadioGroupItem aria-label={fontLabels[font]} className="absolute top-3 right-3" value={font} />
              <span
                aria-hidden="true"
                className="pr-7 text-[22px] leading-none text-foreground"
                style={{ fontFamily: FONT_FAMILIES[font] }}
              >
                Aa 字
              </span>
              <span className="mt-auto pt-5 text-sm font-semibold text-foreground">{fontLabels[font]}</span>
              <span className="mt-1 text-[11px] leading-4 text-muted-foreground">{fontDescriptions[font]}</span>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}

export function AppearanceSection({ settings, updateSettings }: AppearanceSectionProps) {
  const { t } = useTranslation();
  const fontSizePx = getReadingFontSize(settings.fontSize);
  const themeLabels: Record<Settings['theme'], string> = {
    system: t('settings.themeSystem'),
    light: t('settings.themeLight'),
    dark: t('settings.themeDark'),
  };
  const colorThemeLabels: Record<ColorTheme, string> = {
    'quiet-signal': t('settings.themeQuietSignal'),
    graphite: t('settings.themeGraphite'),
    forest: t('settings.themeForest'),
  };
  const colorThemeDescriptions: Record<ColorTheme, string> = {
    'quiet-signal': t('settings.themeQuietSignalDescription'),
    graphite: t('settings.themeGraphiteDescription'),
    forest: t('settings.themeForestDescription'),
  };

  return (
    <section id="appearance" className="scroll-mt-6 overflow-hidden rounded-2xl border border-border bg-card/88 shadow-[0_16px_50px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
      <SectionHeader icon={<Palette className="size-4" />} label={t('settings.appearance')} />
      <div className="flex flex-col gap-7 px-6 py-6">
        <div className="border-b border-border/70 pb-7">
          <div className="text-sm font-semibold text-foreground">{t('settings.colorTheme')}</div>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{t('settings.colorThemeDescription')}</p>
          <RadioGroup
            aria-label={t('settings.colorTheme')}
            className="mt-4 grid grid-cols-3 gap-4 max-[720px]:grid-cols-1"
            value={settings.colorTheme}
            onValueChange={(colorTheme) => void updateSettings({ colorTheme: colorTheme as ColorTheme })}
          >
            {COLOR_THEMES.map((colorTheme) => {
              const active = settings.colorTheme === colorTheme;
              return (
                <label
                  key={colorTheme}
                  className={cn(
                    'relative flex min-h-36 cursor-pointer flex-col rounded-xl border bg-muted/45 p-3.5 transition-colors outline-none',
                    active ? 'border-secondary bg-secondary/8 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--secondary)_45%,transparent)]' : 'border-border hover:bg-muted',
                  )}
                >
                  <RadioGroupItem aria-label={colorThemeLabels[colorTheme]} className="absolute top-2.5 right-2.5 z-10" value={colorTheme} />
                  <ThemePalettePreview colorTheme={colorTheme} />
                  <span className="mt-3 flex items-center gap-2 pr-6 text-sm font-semibold text-foreground">
                    {colorThemeLabels[colorTheme]}
                    {colorTheme === 'quiet-signal' ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-semibold text-accent-foreground">
                        {t('settings.themeDefaultBadge')}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 text-[11px] leading-4 text-muted-foreground">{colorThemeDescriptions[colorTheme]}</span>
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
        <div className="grid gap-7 border-y border-border/70 py-7">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.14em] text-secondary uppercase">{t('settings.typography')}</div>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-muted-foreground">{t('settings.typographyDescription')}</p>
          </div>
          <FontChoiceGroup
            scope="reading"
            label={t('settings.readingFont')}
            description={t('settings.readingFontDescription')}
            value={settings.readingFont}
            options={READING_FONTS}
            onValueChange={(readingFont) => void updateSettings({ readingFont: readingFont as ReadingFont })}
          />
          <FontChoiceGroup
            scope="interface"
            label={t('settings.interfaceFont')}
            description={t('settings.interfaceFontDescription')}
            value={settings.interfaceFont}
            options={INTERFACE_FONTS}
            onValueChange={(interfaceFont) => void updateSettings({ interfaceFont: interfaceFont as InterfaceFont })}
          />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_17rem] items-stretch gap-6 pt-1 max-[900px]:grid-cols-1">
          <figure className="flex min-h-36 flex-col justify-between rounded-xl border border-border bg-background px-5 py-4">
            <figcaption className="flex items-center justify-between gap-4 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              <span>{t('settings.fontPreview')}</span>
              <span className="tabular-nums">{fontSizePx}px</span>
            </figcaption>
            <p
              aria-live="polite"
              className="mt-5 max-w-[34rem] text-pretty leading-[1.75] tracking-[-0.01em] text-foreground"
              style={{ fontFamily: FONT_FAMILIES[settings.readingFont], fontSize: `${fontSizePx}px` }}
            >
              {t('settings.fontPreviewText')}
            </p>
          </figure>

          <div className="flex flex-col justify-between gap-5 py-1">
            <div>
              <h3 id="reading-font-size-label" className="text-sm font-semibold text-foreground">
                {t('settings.readingFontSize')}
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t('settings.readingFontSizeDescription')}
              </p>
            </div>
            <ToggleGroup
              aria-labelledby="reading-font-size-label"
              type="single"
              variant="outline"
              value={settings.fontSize}
              className="grid w-full grid-cols-3"
              onValueChange={(fontSize) => {
                if (fontSize) void updateSettings({ fontSize: fontSize as Settings['fontSize'] });
              }}
            >
              {fontSizes.map((fontSize) => (
                <ToggleGroupItem
                  key={fontSize}
                  value={fontSize}
                  aria-label={`${t(`settings.${fontSize === 'medium' ? 'default' : fontSize}`)} ${READING_FONT_SIZE_PX[fontSize]}px`}
                  className="h-12 flex-1 flex-col gap-0.5"
                >
                  <span>{t(`settings.${fontSize === 'medium' ? 'default' : fontSize}`)}</span>
                  <span className="text-[9px] font-normal text-muted-foreground tabular-nums">
                    {READING_FONT_SIZE_PX[fontSize]}px
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </div>
    </section>
  );
}
