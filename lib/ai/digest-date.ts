export interface LocalDayRange {
  dayKey: string;
  timeZone: string;
  startAt: number;
  endAt: number;
}

export function getLocalDayRange(now = new Date()): LocalDayRange {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  return {
    dayKey: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
    startAt: new Date(year, month, day).getTime(),
    endAt: new Date(year, month, day + 1).getTime(),
  };
}

