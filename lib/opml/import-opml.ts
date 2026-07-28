export interface OpmlSubscription {
  url: string;
  title?: string;
  groupPath: string[];
}

function outlineLabel(outline: Element): string | undefined {
  return outline.getAttribute('title')?.trim() || outline.getAttribute('text')?.trim() || undefined;
}

export function parseOPMLDocument(xml: string): OpmlSubscription[] {
  const document = new DOMParser().parseFromString(xml, 'text/xml');
  if (document.querySelector('parsererror')) {
    throw new Error('Invalid OPML document');
  }

  const subscriptions = new Map<string, OpmlSubscription>();

  document.querySelectorAll('outline[xmlUrl]').forEach((outline) => {
    const url = outline.getAttribute('xmlUrl')?.trim();
    if (!url || !/^https?:\/\//i.test(url) || subscriptions.has(url)) {
      return;
    }

    const groupPath: string[] = [];
    let parent = outline.parentElement;
    while (parent?.tagName.toLowerCase() === 'outline') {
      const label = outlineLabel(parent);
      if (label) groupPath.unshift(label);
      parent = parent.parentElement;
    }

    subscriptions.set(url, {
      url,
      title: outlineLabel(outline),
      groupPath: groupPath.slice(0, 2),
    });
  });

  return [...subscriptions.values()];
}

export function parseOPML(xml: string): string[] {
  return parseOPMLDocument(xml).map((subscription) => subscription.url);
}

export function importOpml(xml: string): string[] {
  return parseOPML(xml);
}
