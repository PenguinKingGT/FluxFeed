import { useMemo } from 'react';
import { highlightArticleCode } from '@/lib/reader/highlight-code';
import { cn } from '@/lib/utils';
import { normalizeArticleStyle } from '@/lib/reader/article-styles';
import type { Settings } from '@/lib/types';
import { getReadingFontSize } from '@/lib/settings/reading-font-size';
import type { PreparedArticleContent } from '@/lib/reader/prepare-article-content';

interface ArticleContentProps {
  content: PreparedArticleContent;
  settings: Settings;
}

/** Applies a bundled prose style to shared sanitized HTML without changing app colors or reading fonts. */
export function ArticleContent({ content, settings }: ArticleContentProps) {
  const cleanHtml = useMemo(() => highlightArticleCode(content.sanitizedHtml), [content.sanitizedHtml]);
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
