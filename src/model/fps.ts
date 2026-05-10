export const FPS_MIN = 1;
export const FPS_MAX = 60;
export const DEFAULT_FPS = 12;

function clamp(value: number): number {
  return Math.max(FPS_MIN, Math.min(FPS_MAX, value));
}

export function normalizeFps(value: unknown, fallback = DEFAULT_FPS): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return normalizeFps(fallback, DEFAULT_FPS);
  }
  return clamp(Math.round(value));
}

export function parseFpsText(text: string, fallback = DEFAULT_FPS): number {
  const parsed = Number.parseInt(text, 10);
  return normalizeFps(parsed, fallback);
}

export function frameDurationMs(fps: number): number {
  return 1000 / normalizeFps(fps);
}
