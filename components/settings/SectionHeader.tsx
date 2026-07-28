import type { ReactNode } from 'react';

interface SectionHeaderProps {
  icon: ReactNode;
  label: string;
}

export function SectionHeader({ icon, label }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border/80 px-6 py-5">
      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-secondary/14 text-secondary">{icon}</span>
      <h3 className="font-serif text-xl leading-6 font-semibold tracking-[-0.02em] text-foreground">{label}</h3>
    </div>
  );
}
