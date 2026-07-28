import { useEffect, useState } from 'react';
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
import type { MessageResponse } from '@/lib/types';

interface CreateGroupModalProps {
  open: boolean;
  parentName?: string;
  onOpenChange: (open: boolean) => void;
  createGroup: (name: string) => Promise<MessageResponse>;
}

export function CreateGroupModal({ open, parentName, onOpenChange, createGroup }: CreateGroupModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setError(null);
      setIsCreating(false);
    }
  }, [open]);

  async function handleSubmit() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    setIsCreating(true);
    setError(null);
    const response = await createGroup(trimmedName);

    if (response.success) {
      onOpenChange(false);
      return;
    }

    setIsCreating(false);
    setError(response.error ?? t('folder.createFailed'));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-border bg-popover text-popover-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{t('folder.createTitle')}</DialogTitle>
          <DialogDescription>
            {parentName ? t('folder.childDescription', { name: parentName }) : t('folder.topDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="folder-name">{t('folder.name')}</Label>
          <Input
            id="folder-name"
            value={name}
            autoFocus
            placeholder={parentName ? t('folder.childNamePlaceholder') : t('folder.namePlaceholder')}
            className="bg-background"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleSubmit();
              }
            }}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter className="bg-muted">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('dialog.cancel')}
          </Button>
          <Button disabled={!name.trim() || isCreating} onClick={handleSubmit}>
            {isCreating ? t('folder.creating') : t('folder.createTitle')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
