interface InstallDetails {
  reason: string;
}

interface InstallDependencies {
  ensureDatabaseDefaults(): Promise<void>;
  getSettings(): Promise<{ refreshInterval: number }>;
  registerRefreshAlarm(intervalMinutes: number): Promise<void>;
}

export async function handleInstall(
  details: InstallDetails,
  dependencies: InstallDependencies,
): Promise<void> {
  if (details.reason === 'install') {
    await dependencies.ensureDatabaseDefaults();
  }

  const settings = await dependencies.getSettings();
  await dependencies.registerRefreshAlarm(settings.refreshInterval);
}
