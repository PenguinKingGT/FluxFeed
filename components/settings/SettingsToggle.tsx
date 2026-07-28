import { Switch } from '@/components/ui/switch';

interface SettingsToggleProps {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

export function SettingsToggle({ checked, label, onCheckedChange }: SettingsToggleProps) {
  return (
    <Switch
      checked={checked}
      aria-label={label}
      className="scale-110"
      onCheckedChange={onCheckedChange}
    />
  );
}
