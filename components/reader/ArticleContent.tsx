import type { Settings } from '@/lib/types';
import { getReadingFontSize } from '@/lib/settings/reading-font-size';
import { sanitizeHtml } from '@/lib/security/sanitize-html';

interface ArticleContentProps {
  html: string;
  settings: Settings;
}

export function ArticleContent({ html, settings }: ArticleContentProps) {
  const cleanHtml = sanitizeHtml(html);

  return (
    <div
      className="reader-prose prose max-w-none font-reading leading-relaxed text-foreground dark:prose-invert"
      style={{ fontSize: `${getReadingFontSize(settings.fontSize)}px` }}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
