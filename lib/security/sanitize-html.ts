import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'strong',
  'em',
  'a',
  'img',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel', 'loading'];

function normalizeUrlAttribute(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const first = trimmed.charAt(0);
  const last = trimmed.charAt(trimmed.length - 1);
  if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
  const template = document.createElement('template');
  template.innerHTML = clean;

  template.content.querySelectorAll('a[href]').forEach((link) => {
    const href = normalizeUrlAttribute(link.getAttribute('href') ?? '');
    if (href) {
      link.setAttribute('href', href);
    } else {
      link.removeAttribute('href');
    }
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });

  template.content.querySelectorAll('img[src]').forEach((image) => {
    const src = normalizeUrlAttribute(image.getAttribute('src') ?? '');
    if (src) {
      image.setAttribute('src', src);
    } else {
      image.removeAttribute('src');
    }
    image.setAttribute('loading', 'lazy');
  });

  const container = document.createElement('div');
  container.append(template.content.cloneNode(true));

  return container.innerHTML;
}

export function extractSummary(html: string, maxLength = 200): string {
  const text = extractPlainText(html);

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}

export function extractPlainText(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = sanitizeHtml(html);
  return (template.content.textContent ?? '').replace(/\s+/g, ' ').trim();
}
