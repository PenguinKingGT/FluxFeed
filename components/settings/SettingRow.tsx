import type { ReactNode } from 'react';

interface SettingRowProps {
  label: string;
  description: string;
  children: ReactNode;
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-8 border-b border-border/70 py-5 last:border-b-0">
      <div className="min-w-0">
        <label className="mb-1 block text-sm font-semibold text-foreground">{label}</label>
        <p className="max-w-md text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
