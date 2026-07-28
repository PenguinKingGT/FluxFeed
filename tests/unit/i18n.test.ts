import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/db';
import { applyLanguage, i18n, resources } from '@/lib/i18n';
import { estimateReadMinutes, formatArticleDate, formatRelativeTime } from '@/lib/i18n/locale-format';

describe('internationalization', () => {
  beforeEach(async () => {
    await applyLanguage('en');
  });

  it('uses English as the default language', () => {
    expect(DEFAULT_SETTINGS.language).toBe('en');
    expect(i18n.language).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches language and synchronizes the html lang attribute', async () => {
    await applyLanguage('zh-CN');

    expect(i18n.t('navigation.inbox')).toBe('收件箱');
    expect(document.documentElement.lang).toBe('zh-CN');

    await applyLanguage('ja');
    expect(i18n.t('navigation.inbox')).toBe('受信トレイ');
    expect(document.documentElement.lang).toBe('ja');
  });

  it('keeps all resource key sets aligned', () => {
    const englishKeys = Object.keys(resources.en.translation).sort();
    expect(Object.keys(resources['zh-CN'].translation).sort()).toEqual(englishKeys);
    expect(Object.keys(resources.ja.translation).sort()).toEqual(englishKeys);
  });

  it('localizes date, relative time, and reading duration', () => {
    const timestamp = Date.UTC(2024, 2, 14);
    const now = Date.UTC(2024, 2, 14, 12);

    expect(formatArticleDate(timestamp, 'en')).toBe('March 14, 2024');
    expect(formatArticleDate(timestamp, 'zh-CN')).toBe('2024年3月14日');
    expect(formatArticleDate(timestamp, 'ja')).toBe('2024年3月14日');
    expect(formatRelativeTime(now - 12 * 60_000, 'zh-CN', now)).toBe('12分钟前');
    expect(formatRelativeTime(now - 2 * 60 * 60_000, 'ja', now)).toBe('2時間前');
    expect(estimateReadMinutes('<p>short text</p>', 'zh-CN')).toBe('阅读约 1 分钟');
  });
});
