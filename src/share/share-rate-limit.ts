import {
  isSupportedShareRateLimitProvider,
  ShareRateLimitConfigurationError,
  type ShareApiEnv,
} from "./share-api-guard";

type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds?: number;
};

type RateLimiter = {
  check: (clientId: string) => Promise<RateLimitResult>;
};

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

type UpstashResponse = {
  result?: number;
};

const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_SECONDS = 60;

function cleanBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function numericEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function rateLimitKey(clientId: string): string {
  return `flipbook:share:create:${clientId.replace(/[^a-zA-Z0-9:._-]/g, "_")}`;
}

export function createUpstashRateLimiter({
  env = process.env,
  fetcher = fetch,
}: {
  env?: ShareApiEnv;
  fetcher?: Fetcher;
} = {}): RateLimiter {
  const baseUrl = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
  }

  const max = numericEnv(env.SHARE_RATE_LIMIT_MAX, DEFAULT_LIMIT);
  const windowSeconds = numericEnv(env.SHARE_RATE_LIMIT_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS);
  const headers = { Authorization: `Bearer ${token}` };

  return {
    async check(clientId) {
      const key = rateLimitKey(clientId);
      const incrementResponse = await fetcher(`${cleanBaseUrl(baseUrl)}/incr/${key}`, { headers });
      if (!incrementResponse.ok) {
        throw new Error(`rate limit increment failed: ${incrementResponse.status}`);
      }

      const increment = (await incrementResponse.json()) as UpstashResponse;
      const count = Number(increment.result ?? 0);
      if (count === 1) {
        const expireResponse = await fetcher(`${cleanBaseUrl(baseUrl)}/expire/${key}/${windowSeconds}`, { headers });
        if (!expireResponse.ok) {
          throw new Error(`rate limit expire failed: ${expireResponse.status}`);
        }
      }

      return {
        limited: count > max,
        retryAfterSeconds: count > max ? windowSeconds : undefined,
      };
    },
  };
}

export async function isShareRateLimited(
  clientId: string,
  env: ShareApiEnv = process.env,
  fetcher: Fetcher = fetch,
): Promise<RateLimitResult> {
  const provider = env.SHARE_RATE_LIMIT_PROVIDER;
  if (!provider) {
    return { limited: false };
  }

  if (!isSupportedShareRateLimitProvider(provider)) {
    throw new ShareRateLimitConfigurationError(provider);
  }

  return createUpstashRateLimiter({ env, fetcher }).check(clientId);
}
