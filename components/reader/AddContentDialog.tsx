import { useMemo, useRef, useState } from 'react';
import { getFeedErrorTranslationKey } from '@/lib/feed/feed-errors';
import { Folder, FolderPlus, Loader2, Rss } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Group, MessageResponse } from '@/lib/types';
import { useArticleStore } from '@/store';

export type CreationMode = 'feed' | 'folder';
const ROOT = '__library_root__';

interface AddContentDialogProps {
  initialMode: CreationMode;
  initialGroupId?: string;
  groups: Group[];
  onClose(): void;
  onRestoreFocus(): void;
  addFeed(url: string, groupId?: string): Promise<MessageResponse>;
  createGroup(name: string, parentId?: string): Promise<MessageResponse>;
  loadFeeds(): Promise<void>;
}

/** A compact form for the selected task; shared layout, validation, and pending-write protection. */
export function AddContentDialog({
  initialMode,
  initialGroupId,
  groups,
  onClose,
  onRestoreFocus,
  addFeed,
  createGroup,
  loadFeeds,
}: AddContentDialogProps) {
  const { t } = useTranslation();
  const loadArticles = useArticleStore((state) => state.loadArticles);
  const isFeed = initialMode === 'feed';
  const [value, setValue] = useState('');
  const [location, setLocation] = useState(() => {
    const selected = groups.find((group) => group.id === initialGroupId);
    return (!isFeed ? selected?.parentId : undefined) ?? initialGroupId ?? ROOT;
  });
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const roots = groups.filter((group) => !group.parentId)
      .sort((left, right) => left.order - right.order);
    return roots.flatMap((root) => [
      { id: root.id, label: root.name },
      ...(isFeed ? groups.filter((group) => group.parentId === root.id)
        .sort((left, right) => left.order - right.order)
        .map((group) => ({ id: group.id, label: `${root.name} / ${group.name}` })) : []),
    ]);
  }, [groups, isFeed]);
  const locationLabel = options.find((group) => group.id === location)?.label
    ?? t(isFeed ? 'feed.noFolder' : 'creation.root');

  /** Pending writes must finish before dismissal or another submission. */
  function close() {
    if (!busy.current) {
      onClose();
    }
  }

  /** Validates input and preserves it on failure so the user can correct or retry. */
  async function submit() {
    if (busy.current) {
      return;
    }
    const trimmed = value.trim();
    setError(null);
    if (isFeed) {
      try {
        const url = new URL(trimmed);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Unsupported protocol');
        }
      } catch {
        setError(t('creation.invalidUrl'));
        inputRef.current?.focus();
        return;
      }
    } else if (!trimmed) {
      setError(t('creation.nameRequired'));
      return;
    }

    busy.current = true;
    setIsBusy(true);
    try {
      const groupId = location === ROOT ? undefined : location;
      const response = isFeed
        ? await addFeed(trimmed, groupId)
        : await createGroup(trimmed, groupId);
      if (!response.success) {
        const errorKey = isFeed ? getFeedErrorTranslationKey(response.error) : undefined;
        const fallback = response.error ?? t(isFeed ? 'feed.addFailed' : 'folder.createFailed');
        setError(errorKey ? t(errorKey) : fallback);
        return;
      }
      if (isFeed) {
        // A refresh failure must not suggest repeating a successful subscription.
        const results = await Promise.allSettled([
          loadFeeds(),
          loadArticles(),
        ]);
        if (results.some((result) => result.status === 'rejected')) {
          toast.error(t('creation.refreshFailed'));
        }
      }
      onClose();
    } catch {
      setError(t(isFeed ? 'feed.addFailed' : 'folder.createFailed'));
    } finally {
      busy.current = false;
      setIsBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        showCloseButton={!isBusy}
        className="max-h-[90dvh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-[27rem]"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <DialogHeader className="flex-row items-center gap-2.5 px-6 pt-6 pb-5 pr-12">
          {isFeed ? <Rss className="size-4 text-secondary" /> : <FolderPlus className="size-4 text-secondary" />}
          <DialogTitle className="text-lg leading-6 font-semibold">
            {t(isFeed ? 'feed.addTitle' : 'folder.createTitle')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t(isFeed ? 'feed.addDescription' : 'folder.topDescription')}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.nativeEvent.isComposing) {
              event.preventDefault();
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="creation-input">{t(isFeed ? 'feed.url' : 'folder.name')}</Label>
              <Input
                ref={inputRef}
                id="creation-input"
                autoFocus
                type={isFeed ? 'url' : 'text'}
                autoComplete={isFeed ? 'url' : 'off'}
                required
                disabled={isBusy}
                value={value}
                placeholder={t(isFeed ? 'feed.urlPlaceholder' : 'folder.namePlaceholder')}
                aria-describedby={error ? 'creation-error' : undefined}
                aria-invalid={Boolean(error)}
                className="h-10 rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-ring/20"
                onChange={(event) => {
                  setError(null);
                  setValue(event.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="creation-location">{t(isFeed ? 'feed.folder' : 'creation.parent')}</Label>
              <Select value={location} disabled={isBusy} onValueChange={setLocation}>
                <SelectTrigger
                  id="creation-location"
                  aria-label={t(isFeed ? 'feed.folder' : 'creation.parent')}
                  className="w-full rounded-lg px-3 data-[size=default]:h-10"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                    <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <SelectValue><span className="block truncate">{locationLabel}</span></SelectValue>
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" align="start" className="max-h-64 w-(--radix-select-trigger-width)">
                  <SelectGroup>
                    <SelectItem value={ROOT}>{t(isFeed ? 'feed.noFolder' : 'creation.root')}</SelectItem>
                    {options.map((group) => (
                      <SelectItem key={group.id} value={group.id}>{group.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {error ? <p id="creation-error" role="alert" className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="mx-0 mb-0 flex-row justify-end rounded-none bg-transparent px-6 py-4">
            <Button type="button" variant="ghost" disabled={isBusy} onClick={close}>
              {t('dialog.cancel')}
            </Button>
            <Button type="submit" disabled={isBusy || !value.trim()}>
              {isBusy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
              {isBusy
                ? t(isFeed ? 'feed.adding' : 'folder.creating')
                : t(isFeed ? 'feed.subscribe' : 'folder.createTitle')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
