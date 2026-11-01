import { XMLParser } from 'fast-xml-parser';
import { getRecord } from './parser-utils';
import { escapeHtmlText, plainTextToHtml } from './text-content';

export type AtomNode = Record<string, unknown>;
const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  trimValues: false,
  parseTagValue: false,
  cdataPropName: '__cdata',
});
const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/** Normalizes only parser-produced arrays; external input still enters through the XML parser. */
function nodes(value: unknown): AtomNode[] {
  return Array.isArray(value) ? value.map(getRecord) : [];
}

/** Parses Atom once in ordered mode so text before/after inline tags cannot be rearranged. */
export function parseAtomNodes(xml: string): AtomNode[] {
  return nodes(parser.parse(xml));
}

/** Reads direct children while retaining their source order. */
export function atomChildren(node: AtomNode | undefined, name: string): AtomNode[] {
  return nodes(node?.[name]);
}

/** Flattens text/CDATA for scalar metadata and encoded HTML constructs, preserving inner whitespace. */
function nodeText(children: AtomNode[]): string {
  return children.map((node) => Object.entries(node).map(([name, value]) => {
    if (name === ':@') {
      return '';
    }
    if (name === '#text') {
      return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    }
    return nodeText(nodes(value));
  }).join('')).join('');
}

/** Reads a scalar field without exposing formatting whitespace around it. */
export function atomText(children: AtomNode[], name: string): string {
  return nodeText(atomChildren(children.find((node) => name in node), name)).trim();
}

/** Serializes ordered XHTML, escaping decoded text/attributes exactly once before final UI sanitization. */
function xhtmlToHtml(children: AtomNode[]): string {
  return children.map((node) => Object.entries(node).map(([name, value]) => {
    if (name === ':@' || name.startsWith('?')) {
      return '';
    }
    if (name === '#text') {
      return escapeHtmlText(typeof value === 'string' ? value : String(value ?? ''));
    }
    if (name === '__cdata') {
      return escapeHtmlText(nodeText(nodes(value)));
    }
    // Strip XHTML element prefixes only here; Atom metadata must not confuse media:content with content.
    const tag = name.slice(name.lastIndexOf(':') + 1);
    const attributes = Object.entries(getRecord(node[':@']))
      .filter(([key]) => key.startsWith('@_') && !key.startsWith('@_xmlns'))
      .map(([key, attribute]) => ` ${key.slice(2)}="${escapeHtmlText(String(attribute))}"`)
      .join('');
    const opening = `<${tag}${attributes}>`;
    return VOID_ELEMENTS.has(tag)
      ? opening
      : `${opening}${xhtmlToHtml(nodes(value))}</${tag}>`;
  }).join('')).join('');
}

/** Decodes text, HTML and XHTML separately; legacy untyped CDATA HTML remains compatible. */
export function atomContent(children: AtomNode[], name: string): string {
  const node = children.find((child) => name in child);
  const content = atomChildren(node, name);
  const type = getRecord(node?.[':@'])['@_type'];
  if (type === 'xhtml' || type === 'application/xhtml+xml') {
    return xhtmlToHtml(content).trim();
  }
  const text = nodeText(content).trim();
  if (type === 'html' || type === 'text/html' || (!type && content.some((child) => '__cdata' in child))) {
    return text;
  }
  return plainTextToHtml(text);
}
