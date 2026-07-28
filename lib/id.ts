export function createRecordId(): string {
  return globalThis.crypto.randomUUID();
}
