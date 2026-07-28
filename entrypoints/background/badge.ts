interface ChromeBadgeApi {
  action: {
    setBadgeText(details: { text: string }): Promise<void> | void;
    setBadgeBackgroundColor(details: { color: string }): Promise<void> | void;
  };
}

interface UnreadCountStorage {
  getUnreadCount(): Promise<number>;
}

export function formatBadgeText(unreadCount: number): string {
  if (unreadCount <= 0) {
    return '';
  }

  return unreadCount > 99 ? '99+' : String(unreadCount);
}

export async function updateBadge(
  chromeApi: ChromeBadgeApi,
  storageService: UnreadCountStorage,
): Promise<void> {
  const unreadCount = await storageService.getUnreadCount();
  const text = formatBadgeText(unreadCount);

  await chromeApi.action.setBadgeText({ text });

  if (text) {
    await chromeApi.action.setBadgeBackgroundColor({ color: '#FEA619' });
  }
}
