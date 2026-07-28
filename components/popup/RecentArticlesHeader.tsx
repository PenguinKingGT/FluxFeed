import { useTranslation } from 'react-i18next';

interface RecentArticlesHeaderProps {
  unreadCount: number;
}

export function RecentArticlesHeader({ unreadCount }: RecentArticlesHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-end justify-between px-5 pt-5 pb-3">
      <div>
        <p className="mb-1 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{t('popup.queueLabel')}</p>
        <h2 className="font-serif text-xl leading-6 font-semibold tracking-[-0.02em] text-foreground">{t('popup.recentArticles')}</h2>
      </div>
      <span className="rounded-md bg-accent px-2 py-1 text-[10px] font-semibold text-accent-foreground tabular-nums">
        {t('popup.unreadCount', { count: unreadCount })}
      </span>
    </div>
  );
}
