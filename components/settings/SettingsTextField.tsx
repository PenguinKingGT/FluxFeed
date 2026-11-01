import { useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type SettingsTextFieldProps = Pick<
  ComponentProps<typeof Input>,
  'id' | 'aria-label' | 'className' | 'placeholder' | 'maxLength'
> & {
  value: string;
  multiline?: boolean;
  onValueChange(value: string): void;
};

/** Keeps focused typing intact while asynchronous saves publish normalized confirmed values. */
export function SettingsTextField({
  value,
  multiline = false,
  onValueChange,
  ...props
}: SettingsTextFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const Control = multiline ? Textarea : Input;

  return (
    <Control
      {...props}
      value={draft ?? value}
      onBlur={() => setDraft(null)}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setDraft(next);
        onValueChange(next);
      }}
    />
  );
}
