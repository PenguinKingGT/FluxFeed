import type { Settings } from '@/lib/types';
import { normalizeColorTheme } from './theme-presets';

type Theme = Settings['theme'];
type ResolvedTheme = Exclude<Theme, 'system'>;

let systemMedia: MediaQueryList | null = null;
let systemListener: ((event: MediaQueryListEvent) => void) | null = null;

function resolveSystemTheme(media: MediaQueryList): ResolvedTheme {
  return media.matches ? 'dark' : 'light';
}

function applyResolvedTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function applyColorTheme(colorTheme: unknown): void {
  document.documentElement.dataset.colorTheme = normalizeColorTheme(colorTheme);
}

function removeSystemListener(): void {
  if (systemMedia && systemListener) {
    systemMedia.removeEventListener('change', systemListener);
  }
  systemMedia = null;
  systemListener = null;
}

export function applyTheme(theme: Theme, colorTheme: unknown = undefined): void {
  applyColorTheme(colorTheme);

  if (theme !== 'system') {
    removeSystemListener();
    applyResolvedTheme(theme);
    return;
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  if (systemMedia !== media) {
    removeSystemListener();
    systemMedia = media;
    systemListener = (event) => applyResolvedTheme(event.matches ? 'dark' : 'light');
    systemMedia.addEventListener('change', systemListener);
  }
  applyResolvedTheme(resolveSystemTheme(media));
}
