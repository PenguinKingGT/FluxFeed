import type { ReactNode } from 'react';

interface PopupEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function PopupEmptyState({ icon, title, description }: PopupEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-10 py-12 text-center">
      <div className="relative mb-3">
        <div className="absolute inset-0 scale-150 rounded-full bg-secondary/10 blur-xl" />
        <div className="relative rounded-xl border border-border bg-card p-3 text-secondary shadow-sm">{icon}</div>
      </div>
      <p className="font-serif text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</p>
      <p className="max-w-64 text-sm leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}
