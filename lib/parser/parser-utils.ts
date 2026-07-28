import { XMLParser } from 'fast-xml-parser';

export const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  cdataPropName: '__cdata',
});

export function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function readText(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => readText(item)).join('').trim();
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return readText(record.__cdata) || readText(record['#text']);
  }

  return '';
}

export function parseDate(value: unknown): number {
  const timestamp = Date.parse(readText(value));
  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function fallbackTitle(title: unknown, content: string): string {
  const textTitle = readText(title);
  if (textTitle) {
    return textTitle;
  }

  return stripHtml(content).slice(0, 50);
}

export function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}
