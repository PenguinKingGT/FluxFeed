import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ReaderLayout } from '@/components/reader/ReaderLayout';
import { DailyDigestLayout } from '@/components/digest/DailyDigestLayout';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { useFeedStore, useGroupStore, useSettingsStore } from '@/store';

const legacySettingsPaths = ['/general', '/appearance', '/data', '/shortcuts'];

export function App() {
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const loadFeeds = useFeedStore((state) => state.loadFeeds);
  const loadGroups = useGroupStore((state) => state.loadGroups);

  useEffect(() => {
    void loadSettings();
    void loadFeeds();
    void loadGroups();
  }, [loadSettings, loadFeeds, loadGroups]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/inbox" replace />} />
        <Route path="/inbox" element={<ReaderLayout view="inbox" />} />
        <Route path="/starred" element={<ReaderLayout view="starred" />} />
        <Route path="/all" element={<ReaderLayout view="all" />} />
        <Route path="/digest" element={<DailyDigestLayout />} />
        <Route path="/article/:articleId" element={<ReaderLayout view="all" />} />
        <Route path="/folder/:name" element={<ReaderLayout view="folder" />} />
        <Route path="/feed/:feedId" element={<ReaderLayout view="feed" />} />
        <Route path="/settings" element={<SettingsLayout />} />
        {legacySettingsPaths.map((path) => (
          <Route key={path} path={path} element={<Navigate to="/settings" replace />} />
        ))}
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Routes>
    </HashRouter>
  );
}
