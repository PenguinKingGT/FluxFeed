import { useState } from 'react';
import { Rss } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

const NO_GROUP_VALUE = '__no_group__';

interface AddFeedModalProps {
  open: boolean;
  groups: Group[];
  onOpenChange: (open: boolean) => void;
  addFeed: (url: string, groupId?: string) => Promise<MessageResponse>;
  loadFeeds: () => Promise<void>;
}

export function AddFeedModal({ open, groups, onOpenChange, addFeed, loadFeeds }: AddFeedModalProps) {
  const { t } = useTranslation();
  const loadArticles = useArticleStore((state) => state.loadArticles);
  const [url, setUrl] = useState('');
  const [groupId, setGroupId] = useState(NO_GROUP_VALUE);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!url.trim()) return;
    setIsAdding(true);
    setError(null);
    const response = await addFeed(url.trim(), groupId === NO_GROUP_VALUE ? undefined : groupId);
    if (response.success) {
      await loadFeeds();
      await loadArticles({ view: 'inbox', showUnreadOnly: true });
      setUrl('');
      setGroupId(NO_GROUP_VALUE);
      setIsAdding(false);
      onOpenChange(false);
      return;
    }
    setIsAdding(false);
    setError(response.error ?? t('feed.addFailed'));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden bg-popover p-0 text-popover-foreground sm:max-w-[26rem]">
        <form onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}>
          <DialogHeader className="flex-row items-start gap-3 px-5 pt-5 pr-14">
            <div aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/12 text-secondary">
              <Rss className="size-4" />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle className="font-serif text-lg leading-tight tracking-[-0.02em]">
                {t('feed.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-xs leading-5">
                {t('feed.addDescription')}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-5 py-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feed-url" className="text-xs font-semibold">
                {t('feed.url')}
              </Label>
              <Input
                id="feed-url"
                type="url"
                autoComplete="url"
                autoFocus
                required
                placeholder={t('feed.urlPlaceholder')}
                value={url}
                className="bg-background"
                onChange={(event) => setUrl(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feed-folder" className="text-xs font-semibold">
                {t('feed.folder')}
              </Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger
                  id="feed-folder"
                  aria-label={t('feed.folder')}
                  className="w-full bg-background"
                >
                  <SelectValue placeholder={t('feed.noFolder')} />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  className="w-(--radix-select-trigger-width)"
                >
                  <SelectGroup>
                    <SelectItem value={NO_GROUP_VALUE}>{t('feed.noFolder')}</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.parentId ? `— ${group.name}` : group.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {error ? <p role="alert" className="text-xs leading-5 text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none bg-muted/25 px-5 py-3.5">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('dialog.cancel')}
            </Button>
            <Button type="submit" disabled={!url.trim() || isAdding}>
              {isAdding ? t('feed.adding') : t('feed.subscribe')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
