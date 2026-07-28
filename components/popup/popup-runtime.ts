import { browser } from 'wxt/browser';

export interface PopupRuntime {
  runtime: {
    getURL(path: string): string;
  };
  tabs: {
    create(details: { url: string }): Promise<unknown> | unknown;
  };
}

export function createOptionsUrl(runtime: PopupRuntime['runtime'], hashPath = ''): string {
  const hash = hashPath ? `#${hashPath}` : '';
  return `${runtime.getURL('options.html')}${hash}`;
}

export async function openArticleInOptions(
  articleId: string,
  runtime = browser as PopupRuntime,
): Promise<void> {
  await runtime.tabs.create({
    url: createOptionsUrl(runtime.runtime, `/article/${encodeURIComponent(articleId)}`),
  });
}

export async function openSettingsInOptions(runtime = browser as PopupRuntime): Promise<void> {
  await runtime.tabs.create({
    url: createOptionsUrl(runtime.runtime, '/'),
  });
}
