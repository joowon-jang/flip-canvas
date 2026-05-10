export function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}_${random.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18)}`;
}

export function now(): number {
  return Date.now();
}
