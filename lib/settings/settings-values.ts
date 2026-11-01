import { DEFAULT_SETTINGS } from '@/lib/db/defaults';
import type { Settings, SettingsPatch } from '@/lib/types';

/** Completes legacy settings and merges only supplied fields without mutating defaults or snapshots. */
export function mergeSettings(current?: Settings, patch: SettingsPatch = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...current,
    ...patch,
    ai: {
      ...DEFAULT_SETTINGS.ai,
      ...current?.ai,
      ...patch.ai,
    },
    id: 'global',
  };
}
