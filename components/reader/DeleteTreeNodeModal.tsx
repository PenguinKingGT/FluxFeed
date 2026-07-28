import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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
import type { MessageResponse } from '@/lib/types';
import type { ReaderTreeNode } from './FolderTree';

interface DeleteTreeNodeModalProps {
  open: boolean;
  node?: ReaderTreeNode;
  onOpenChange: (open: boolean) => void;
  onDelete: (node: ReaderTreeNode) => Promise<MessageResponse>;
}

export function DeleteTreeNodeModal({ open, node, onOpenChange, onDelete }: DeleteTreeNodeModalProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setIsDeleting(false);
      setError(null);
    }
  }, [open]);

  async function handleDelete() {
    if (!node) return;

    setIsDeleting(true);
    setError(null);
    const response = await onDelete(node);

    if (response.success) {
      onOpenChange(false);
      return;
    }

    setIsDeleting(false);
    setError(response.error ?? t('delete.failed', { type: node.type }));
  }

  const isFolder = node?.type === 'folder';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isDeleting && onOpenChange(nextOpen)}>
      <DialogContent className="overflow-hidden border border-border bg-popover text-popover-foreground" showCloseButton={!isDeleting}>
        <DialogHeader>
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 pr-6">
              <DialogTitle className="break-all font-serif text-xl leading-snug">
                {t(isFolder ? 'delete.folderTitle' : 'delete.feedTitle', { name: node?.name ?? '' })}
              </DialogTitle>
              <DialogDescription className="wrap-break-word">
                {t(isFolder ? 'delete.folderDescription' : 'delete.feedDescription')}
              </DialogDescription>
              <p className="text-sm font-medium text-destructive">{t('delete.irreversible')}</p>
            </div>
          </div>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" disabled={isDeleting} onClick={() => onOpenChange(false)}>
            {t('dialog.cancel')}
          </Button>
          <Button variant="destructive" disabled={!node || isDeleting} onClick={() => void handleDelete()}>
            {isDeleting ? t('delete.deleting') : t(isFolder ? 'delete.folderAction' : 'delete.feedAction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
