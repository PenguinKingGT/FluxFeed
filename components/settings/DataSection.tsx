import { useState } from 'react';
import { Database, Download, Loader2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Feed, Group, MessageResponse } from '@/lib/types';
import { generateOPML } from '@/lib/opml/export-opml';
import { parseOPMLDocument } from '@/lib/opml/import-opml';
import { useArticleStore } from '@/store';
import { SectionHeader } from './SectionHeader';

interface DataSectionProps {
  feeds: Feed[];
  groups: Group[];
  addFeed: (url: string, groupId?: string) => Promise<MessageResponse>;
  createGroup: (name: string, parentId?: string) => Promise<MessageResponse>;
}

export function DataSection({ feeds, groups, addFeed, createGroup }: DataSectionProps) {
  const { t } = useTranslation();
  const loadArticles = useArticleStore((state) => state.loadArticles);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const subscriptions = parseOPMLDocument(await file.text());
      const knownGroups = new Map(
        groups.map((group) => [`${group.parentId ?? 'root'}\u0000${group.name}`, group]),
      );
      let imported = 0;
      let skipped = 0;
      let failed = 0;

      async function resolveGroup(path: string[]): Promise<string | undefined> {
        let parentId: string | undefined;
        for (const name of path) {
          const key = `${parentId ?? 'root'}\u0000${name}`;
          let group = knownGroups.get(key);
          if (!group) {
            const response = await createGroup(name, parentId);
            group = (response.data as { group?: Group } | undefined)?.group;
            if (!response.success || !group) {
              throw new Error(response.error ?? 'Failed to create group');
            }
            knownGroups.set(key, group);
          }
          parentId = group.id;
        }
        return parentId;
      }

      for (const subscription of subscriptions) {
        try {
          const groupId = await resolveGroup(subscription.groupPath);
          const response = await addFeed(subscription.url, groupId);
          if (response.success) {
            const duplicate = (response.data as { duplicate?: boolean } | undefined)?.duplicate;
            if (duplicate) {
              skipped += 1;
            } else {
              imported += 1;
            }
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      }
      setImportResult(t('settings.importResult', { imported, skipped, failed }));
      await loadArticles({ view: 'inbox' });
    } catch {
      setImportResult(t('settings.importInvalid'));
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  }

  function handleExport() {
    const opml = generateOPML(feeds, groups);
    const blob = new Blob([opml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `fluxfeed-${new Date().toISOString().slice(0, 10)}.opml`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section id="data" className="scroll-mt-6 overflow-hidden rounded-2xl border border-border bg-card/88 shadow-[0_16px_50px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
      <SectionHeader icon={<Database className="size-4" />} label={t('settings.dataManagement')} />
      <div className="grid grid-cols-2 gap-3 p-6">
        <label className="group flex min-h-24 cursor-pointer flex-col items-start justify-between rounded-xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-ring/40 hover:bg-muted focus-within:ring-2 focus-within:ring-ring/60">
          {isImporting ? <Loader2 className="size-5 animate-spin text-secondary" /> : <Upload className="size-5 text-secondary" />}
          <span className="text-sm font-semibold text-foreground">{t('settings.importOpml')}</span>
          <input disabled={isImporting} aria-label={t('settings.importOpmlFile')} type="file" accept=".opml,.xml" className="hidden" onChange={(event) => void handleImport(event)} />
        </label>
        <button className="group flex min-h-24 flex-col items-start justify-between rounded-xl border border-border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-ring/40 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none" onClick={handleExport}>
          <Download className="size-5 text-secondary" />
          <span className="text-sm font-semibold text-foreground">{t('settings.exportOpml')}</span>
        </button>
        {importResult ? <p role="status" className="col-span-2 text-xs text-muted-foreground">{importResult}</p> : null}
      </div>
    </section>
  );
}
