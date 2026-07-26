import { deepEqual, equal, rejects } from "node:assert/strict";

import { createUpstashRateLimiter, isShareRateLimited } from "../src/share/share-rate-limit";
import { describe, it } from "./harness";

describe("share durable rate limit", () => {
  it("allows development requests without a configured provider", async () => {
    const result = await isShareRateLimited("127.0.0.1", { NODE_ENV: "development" });

    deepEqual(result, { limited: false });
  });

  it("uses Upstash Redis REST when configured", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const limiter = createUpstashRateLimiter({
      env: {
        SHARE_RATE_LIMIT_PROVIDER: "upstash",
        UPSTASH_REDIS_REST_URL: "https://redis.example.com",
        UPSTASH_REDIS_REST_TOKEN: "secret",
        SHARE_RATE_LIMIT_MAX: "2",
        SHARE_RATE_LIMIT_WINDOW_SECONDS: "60",
      },
      fetcher: async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify({ result: 3 }), { status: 200 });
      },
    });

    const result = await limiter.check("1.2.3.4");

    equal(result.limited, true);
    equal(result.retryAfterSeconds, 60);
    equal(calls.length, 1);
    equal(calls[0].url, "https://redis.example.com/incr/flipbook:share:create:1.2.3.4");
    equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer secret");
  });

  it("sets the Upstash TTL only when the window starts", async () => {
    const calls: string[] = [];
    const limiter = createUpstashRateLimiter({
      env: {
        SHARE_RATE_LIMIT_PROVIDER: "upstash",
        UPSTASH_REDIS_REST_URL: "https://redis.example.com/",
        UPSTASH_REDIS_REST_TOKEN: "secret",
        SHARE_RATE_LIMIT_WINDOW_SECONDS: "120",
      },
      fetcher: async (url: string | URL | Request) => {
        calls.push(String(url));
        return new Response(JSON.stringify({ result: 1 }), { status: 200 });
      },
    });

    const result = await limiter.check("client");

    equal(result.limited, false);
    deepEqual(calls, [
      "https://redis.example.com/incr/flipbook:share:create:client",
      "https://redis.example.com/expire/flipbook:share:create:client/120",
    ]);
  });

  it("rejects unsupported configured providers instead of silently disabling limits", async () => {
    await rejects(
      () => isShareRateLimited("client", { SHARE_RATE_LIMIT_PROVIDER: "memory" }),
      /unsupported SHARE_RATE_LIMIT_PROVIDER/,
    );
  });
});
