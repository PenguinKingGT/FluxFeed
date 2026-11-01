import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';

const languages = { javascript, typescript, css, xml, json, python, bash, sql, yaml, java, cpp, csharp, go, rust };
for (const [name, definition] of Object.entries(languages)) {
  hljs.registerLanguage(name, definition);
}

const AUTO_LANGUAGES = ['css', 'xml', 'javascript', 'json', 'python', 'bash', 'sql', 'yaml'];
const MAX_BLOCK_CHARACTERS = 20000;
const MAX_TOTAL_CHARACTERS = 100000;
const MAX_BLOCKS = 20;

/** Highlights sanitized code as text, bounding automatic detection work on large feeds. */
export function highlightArticleCode(sanitizedHtml: string): string {
  const template = document.createElement('template');
  template.innerHTML = sanitizedHtml;
  let processedCharacters = 0;
  let processedBlocks = 0;

  for (const pre of template.content.querySelectorAll('pre')) {
    const source = pre.textContent ?? '';
    const originalCode = pre.querySelector('code');
    const language = originalCode?.getAttribute('data-code-language')
      ?? pre.getAttribute('data-code-language');
    if (
      !source.trim()
      || language === 'plaintext'
      || (language && !hljs.getLanguage(language))
      || source.length > MAX_BLOCK_CHARACTERS
      || processedCharacters + source.length > MAX_TOTAL_CHARACTERS
      || processedBlocks >= MAX_BLOCKS
    ) {
      continue;
    }
    processedCharacters += source.length;
    processedBlocks += 1;

    try {
      const result = language
        ? hljs.highlight(source, { language, ignoreIllegals: true })
        : hljs.highlightAuto(source, AUTO_LANGUAGES);
      if (!result.language) {
        continue;
      }
      const code = document.createElement('code');
      // Only highlighter-generated spans survive; source markup is never interpreted as HTML.
      code.innerHTML = DOMPurify.sanitize(result.value, {
        ALLOWED_TAGS: ['span'],
        ALLOWED_ATTR: ['class'],
        ALLOW_DATA_ATTR: false,
      });
      code.className = 'hljs';
      code.setAttribute('data-highlighted-language', result.language);
      pre.replaceChildren(code);
    } catch {
      // A grammar failure must leave the readable, sanitized source in place.
    }
  }
  return template.innerHTML;
}
