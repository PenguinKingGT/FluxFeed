import { browser } from 'wxt/browser';

export interface ReaderTabsRuntime {
  tabs: {
    create(details: { url: string; active?: boolean }): Promise<unknown> | unknown;
  };
}

export interface ReaderUrlRuntime {
  getURL(path: string): string;
}

export function createReaderUrl(runtime: ReaderUrlRuntime, hashPath = ''): string {
  const hash = hashPath ? `#${hashPath}` : '';
  return `${runtime.getURL('options.html')}${hash}`;
}

export async function openArticleUrl(url: string, runtime: ReaderTabsRuntime = browser): Promise<void> {
  await runtime.tabs.create({ url, active: false });
}

export async function openSupportPage(runtime: ReaderTabsRuntime = browser): Promise<void> {
  await runtime.tabs.create({ url: 'https://github.com/PenguinKingGT/FluxFeed' });
}
