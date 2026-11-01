import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p',
  'br',
  'hr',
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

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel', 'loading', 'class'];

/** Removes feed-provided outer quotes before URL protocol validation. */
function normalizeUrlAttribute(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const first = trimmed.charAt(0);
  const last = trimmed.charAt(trimmed.length - 1);
  if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/** Normalizes URLs in inert source content; the result still requires sanitization. */
function normalizeContentUrls(content: DocumentFragment): void {
  for (const element of content.querySelectorAll('a[href], img[src]')) {
    const attribute = element.matches('a') ? 'href' : 'src';
    const value = normalizeUrlAttribute(element.getAttribute(attribute) ?? '');
    if (value) {
      element.setAttribute(attribute, value);
    } else {
      element.removeAttribute(attribute);
    }
  }
}

/** Sanitizes feed HTML, validating normalized URLs before adding reader metadata. */
export function sanitizeHtml(html: string): string {
  // Template content is inert. Never attach it to the document before sanitization.
  const template = document.createElement('template');
  template.innerHTML = html;
  normalizeContentUrls(template.content);

  // URL mutation after this step could turn an apparently relative URL into a dangerous scheme.
  const content = DOMPurify.sanitize(template.content, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    RETURN_DOM_FRAGMENT: true,
  });

  // Retain only a bounded code-language hint, never feed-provided CSS classes.
  content.querySelectorAll('[class]').forEach((element) => {
    if (element.matches('pre, code')) {
      const classes = element.getAttribute('class') ?? '';
      const hint = classes.match(/(?:language-|lang-|brush:\s*)([a-z0-9+#-]{1,32})(?=[\s;]|$)/i)?.[1];
      if (/(?:^|\s)(?:nohighlight|no-highlight|plain|plaintext|text)(?:\s|$)/i.test(classes)) {
        element.setAttribute('data-code-language', 'plaintext');
      } else if (hint) {
        element.setAttribute('data-code-language', hint.toLowerCase());
      }
    }
    element.removeAttribute('class');
  });

  content.querySelectorAll('a[href]').forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });

  content.querySelectorAll('img[src]').forEach((image) => {
    image.setAttribute('loading', 'lazy');
  });

  const container = document.createElement('div');
  container.append(content);

  return container.innerHTML;
}

export function extractSummary(html: string, maxLength = 200): string {
  const text = extractPlainText(html);

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}

/** Extracts safe source text, optionally retaining paragraph breaks for AI chunks. */
export function extractPlainText(html: string, preserveParagraphs = false): string {
  return extractSanitizedText(sanitizeHtml(html), preserveParagraphs);
}

/** Extracts text from already sanitized reader HTML; never use this result as renderable HTML. */
export function extractSanitizedText(sanitizedHtml: string, preserveParagraphs = false): string {
  const template = document.createElement('template');
  template.innerHTML = sanitizedHtml;
  if (preserveParagraphs) {
    template.content.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, tr')
      .forEach((element) => {
        element.append(document.createTextNode('\n\n'));
      });
    template.content.querySelectorAll('br').forEach((element) => {
      element.replaceWith(document.createTextNode('\n'));
    });
    return (template.content.textContent ?? '')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return (template.content.textContent ?? '').replace(/\s+/g, ' ').trim();
}
