import { Sidebar } from '@/components/reader/Sidebar';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Database, Keyboard, Palette, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useFeedStore, useGroupStore, useSettingsStore } from '@/store';
import { AppearanceSection } from './AppearanceSection';
import { AiSection } from './AiSection';
import { DataSection } from './DataSection';
import { GeneralSection } from './GeneralSection';
import { ShortcutsSection } from './ShortcutsSection';

function SettingsHeader() {
  const { t } = useTranslation();
  return (
    <header>
      <p className="mb-3 text-[10px] font-semibold tracking-[0.16em] text-secondary uppercase">{t('settings.kicker')}</p>
      <h2 className="mb-3 text-balance font-serif text-4xl leading-none font-semibold tracking-[-0.04em] text-foreground">{t('settings.title')}</h2>
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">{t('settings.description')}</p>
    </header>
  );
}

export function SettingsLayout() {
  const [searchParams] = useSearchParams();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const settingsError = useSettingsStore((state) => state.error);
  const feeds = useFeedStore((state) => state.feeds);
  const addFeed = useFeedStore((state) => state.addFeed);
  const removeFeed = useFeedStore((state) => state.removeFeed);
  const loadFeeds = useFeedStore((state) => state.loadFeeds);
  const groups = useGroupStore((state) => state.groups);
  const createGroup = useGroupStore((state) => state.createGroup);
  const deleteGroup = useGroupStore((state) => state.deleteGroup);
  const moveTreeNode = useGroupStore((state) => state.moveTreeNode);
  const { t } = useTranslation();
  const sections = [
    { id: 'general', label: t('settings.general'), icon: SlidersHorizontal },
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'ai', label: t('settings.ai'), icon: Sparkles },
    { id: 'data', label: t('settings.dataManagement'), icon: Database },
    { id: 'shortcuts', label: t('settings.shortcuts'), icon: Keyboard },
  ];

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    document.getElementById(section)?.scrollIntoView({ block: 'start' });
  }, [searchParams]);

  function scrollToSection(sectionId: string) {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  return (
    <div className="surface-noise flex min-h-screen bg-background">
      <Sidebar
        currentView="settings"
        feeds={feeds}
        groups={groups}
        unreadCount={0}
        addFeed={addFeed}
        loadFeeds={loadFeeds}
        createGroup={createGroup}
        deleteGroup={deleteGroup}
        removeFeed={removeFeed}
        moveTreeNode={moveTreeNode}
      />
      <main className="reader-scrollbar h-screen min-w-0 flex-1 overflow-y-auto text-foreground">
        <div data-testid="settings-container" className="mx-auto grid w-full max-w-6xl grid-cols-[220px_minmax(0,1fr)] gap-14 px-12 py-14 max-[1100px]:grid-cols-1 max-[1100px]:gap-8 max-[1100px]:px-8">
          <aside className="sticky top-14 h-fit max-[1100px]:static">
            <SettingsHeader />
            <nav aria-label={t('settings.title')} className="mt-10 flex flex-col gap-1 border-l border-border pl-3">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                  onClick={() => scrollToSection(id)}
                >
                  <Icon className="size-3.5 transition-colors group-hover:text-secondary" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="mt-8 border-t border-border pt-5">
              <p className="text-[10px] leading-4 text-muted-foreground">{t('settings.instantSave')}</p>
            </div>
          </aside>
          <div className="flex min-w-0 flex-col gap-6 pb-24">
            {settingsError ? (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {t('settings.saveFailed')}
              </p>
            ) : null}
            <GeneralSection settings={settings} updateSettings={updateSettings} />
            <AppearanceSection settings={settings} updateSettings={updateSettings} />
            <AiSection settings={settings} updateSettings={updateSettings} />
            <DataSection feeds={feeds} groups={groups} addFeed={addFeed} createGroup={createGroup} />
            <ShortcutsSection />
          </div>
        </div>
      </main>
    </div>
  );
}
