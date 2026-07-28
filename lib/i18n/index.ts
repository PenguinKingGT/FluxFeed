import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Settings } from '@/lib/types';
import { en } from './resources/en';
import { ja } from './resources/ja';
import { zhCN } from './resources/zh-CN';

export const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
  ja: { translation: ja },
} as const;

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  keySeparator: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export async function applyLanguage(language: Settings['language']): Promise<void> {
  await i18n.changeLanguage(language);
  document.documentElement.lang = language;
}
