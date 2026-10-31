const READER_LAYOUT_PREFERENCES_KEY = 'fluxfeed:reader-layout:v1';

interface ReaderLayoutPreferences {
  focusMode: boolean;
  sidebarCollapsed?: boolean;
}

const defaultPreferences: ReaderLayoutPreferences = {
  focusMode: false,
  sidebarCollapsed: false,
};

/** Reads local layout choices while retaining compatibility with focus-only preferences. */
export function readReaderLayoutPreferences(): ReaderLayoutPreferences {
  if (typeof window === 'undefined') return defaultPreferences;

  try {
    const stored = window.localStorage.getItem(READER_LAYOUT_PREFERENCES_KEY);
    if (!stored) return defaultPreferences;

    const parsed = JSON.parse(stored) as Partial<ReaderLayoutPreferences>;
    return {
      focusMode: parsed.focusMode === true,
      sidebarCollapsed: parsed.sidebarCollapsed === true,
    };
  } catch {
    return defaultPreferences;
  }
}

/** Saves UI-only layout choices without involving the background runtime. */
export function writeReaderLayoutPreferences(preferences: ReaderLayoutPreferences) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(READER_LAYOUT_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Reading remains usable when browser storage is unavailable.
  }
}
