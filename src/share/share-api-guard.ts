export type ShareApiEnv = Record<string, string | undefined>;

const DEFAULT_MAX_BODY_BYTES = 2048;
const SUPPORTED_RATE_LIMIT_PROVIDERS = new Set(["upstash"]);

export class ShareRequestTooLargeError extends Error {
  constructor(limit: number) {
    super(`request body too large: max ${limit} bytes`);
    this.name = "ShareRequestTooLargeError";
  }
}

export class ShareRateLimitConfigurationError extends Error {
  constructor(provider?: string) {
    super(
      provider
        ? `unsupported SHARE_RATE_LIMIT_PROVIDER: ${provider}`
        : "SHARE_RATE_LIMIT_PROVIDER is required in production",
    );
    this.name = "ShareRateLimitConfigurationError";
  }
}

function cleanOrigin(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function maxBodyBytes(env: ShareApiEnv): number {
  const parsed = Number(env.SHARE_MAX_BODY_BYTES ?? DEFAULT_MAX_BODY_BYTES);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_MAX_BODY_BYTES;
}

export function shareAllowedOrigins(env: ShareApiEnv = process.env): string[] {
  const configured = env.SHARE_ALLOWED_ORIGINS;
  const origins = configured
    ? configured.split(",").map(cleanOrigin)
    : [env.APP_PUBLIC_BASE_URL].map((value) => (value ? cleanOrigin(value) : undefined));

  return [...new Set(origins.filter((origin): origin is string => Boolean(origin)))];
}

export function isShareOriginAllowed(origin: string | null, env: ShareApiEnv = process.env): boolean {
  if (!origin) {
    return true;
  }

  const cleanedOrigin = cleanOrigin(origin);
  if (!cleanedOrigin) {
    return false;
  }

  const allowedOrigins = shareAllowedOrigins(env);
  return allowedOrigins.length === 0 || allowedOrigins.includes(cleanedOrigin);
}

export function buildShareCorsHeaders(origin: string | null, env: ShareApiEnv = process.env): Record<string, string> {
  const allowedOrigins = shareAllowedOrigins(env);
  const cleanedOrigin = origin ? cleanOrigin(origin) : undefined;
  const allowOrigin =
    cleanedOrigin && allowedOrigins.includes(cleanedOrigin)
      ? cleanedOrigin
      : !cleanedOrigin && allowedOrigins[0]
        ? allowedOrigins[0]
        : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export function parseShareJsonBody(bodyText: string, env: ShareApiEnv = process.env): unknown {
  const limit = maxBodyBytes(env);
  const bytes = new TextEncoder().encode(bodyText).byteLength;
  if (bytes > limit) {
    throw new ShareRequestTooLargeError(limit);
  }
  return JSON.parse(bodyText);
}

export function isSupportedShareRateLimitProvider(provider: string | undefined): provider is "upstash" {
  return provider === "upstash";
}

export function assertShareRateLimitConfigured(env: ShareApiEnv = process.env): void {
  const provider = env.SHARE_RATE_LIMIT_PROVIDER;
  if (env.NODE_ENV === "production" && !provider) {
    throw new ShareRateLimitConfigurationError();
  }
  if (provider && !SUPPORTED_RATE_LIMIT_PROVIDERS.has(provider)) {
    throw new ShareRateLimitConfigurationError(provider);
  }
}

export function shareClientIdFromRequest(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "anonymous";
}
