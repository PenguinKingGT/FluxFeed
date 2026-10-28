import { useRef } from 'react';
import { DropdownMenu } from 'radix-ui';
import { FolderPlus, Plus, Rss } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { CreationMode } from './AddContentDialog';

interface CreationMenuProps {
  label?: string;
  allowFolder?: boolean;
  onSelect(mode: CreationMode, trigger: HTMLButtonElement | null): void;
}

/** Offers feed and folder creation at the same plus button without an intermediate dialog. */
export function CreationMenu({ label, allowFolder = true, onSelect }: CreationMenuProps) {
  const { t } = useTranslation();
  const trigger = useRef<HTMLButtonElement>(null);
  const openingDialog = useRef(false);

  /** Lets the dialog take focus instead of returning it to the closed menu. */
  function select(mode: CreationMode) {
    openingDialog.current = true;
    onSelect(mode, trigger.current);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          ref={trigger}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label ?? t('creation.add')}
          title={label ?? t('creation.add')}
        >
          <Plus />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-44 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
          onCloseAutoFocus={(event) => {
            if (openingDialog.current) {
              event.preventDefault();
              openingDialog.current = false;
            }
          }}
        >
          <DropdownMenu.Item
            className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
            onSelect={() => select('feed')}
          >
            <Rss className="size-4" aria-hidden="true" />
            {t('navigation.addFeed')}
          </DropdownMenu.Item>
          {allowFolder ? (
            <DropdownMenu.Item
              className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
              onSelect={() => select('folder')}
            >
              <FolderPlus className="size-4" aria-hidden="true" />
              {t('folder.createTitle')}
            </DropdownMenu.Item>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
