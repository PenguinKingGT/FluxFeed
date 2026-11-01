import { useMemo } from 'react';
import { highlightArticleCode } from '@/lib/reader/highlight-code';
import { cn } from '@/lib/utils';
import { normalizeArticleStyle } from '@/lib/reader/article-styles';
import type { Settings } from '@/lib/types';
import { getReadingFontSize } from '@/lib/settings/reading-font-size';
import { sanitizeHtml } from '@/lib/security/sanitize-html';

interface ArticleContentProps {
  html: string;
  settings: Settings;
}

/** Applies a bundled prose style to sanitized HTML without changing app colors or reading fonts. */
export function ArticleContent({ html, settings }: ArticleContentProps) {
  const cleanHtml = useMemo(() => highlightArticleCode(sanitizeHtml(html)), [html]);
  const articleStyle = normalizeArticleStyle(settings.articleStyle);

  return (
    <div
      data-article-style={articleStyle}
      className={cn(
        'reader-prose prose max-w-none font-reading leading-relaxed text-foreground dark:prose-invert',
        articleStyle !== 'default' && 'article-styled',
      )}
      style={{ fontSize: `${getReadingFontSize(settings.fontSize)}px` }}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
