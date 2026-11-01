import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ARTICLE_STYLES, normalizeArticleStyle } from '@/lib/reader/article-styles';
import type { ArticleStyle } from '@/lib/types';

interface ArticleStyleSelectProps {
  value?: ArticleStyle;
  onValueChange: (style: ArticleStyle) => void;
}

/** Selects the persisted article presentation from appearance settings. */
export function ArticleStyleSelect({ value, onValueChange }: ArticleStyleSelectProps) {
  const { t } = useTranslation();
  const current = normalizeArticleStyle(value);

  return (
    <Select value={current} onValueChange={(style) => onValueChange(normalizeArticleStyle(style))}>
      <SelectTrigger
        aria-label={t('settings.articleStyle')}
        title={`${t('settings.articleStyle')}: ${t(`articleStyle.${current}`)}`}
        className="min-w-36 bg-background"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {ARTICLE_STYLES.map((style) => (
          <SelectItem key={style} value={style}>{t(`articleStyle.${style}`)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
