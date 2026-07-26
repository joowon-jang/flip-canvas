import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("environment example contract", () => {
  it("documents every env required by sharing, R2, and production rate limiting", () => {
    const env = readFileSync(resolve(".env.example"), "utf8");

    for (const key of [
      "R2_ACCOUNT_ID",
      "R2_BUCKET",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_PUBLIC_BASE_URL",
      "APP_PUBLIC_BASE_URL",
      "EXPO_PUBLIC_APP_PUBLIC_BASE_URL",
      "SHARE_ALLOWED_ORIGINS",
      "SHARE_MAX_BODY_BYTES=2048",
      "SHARE_RATE_LIMIT_PROVIDER=upstash",
      "SHARE_RATE_LIMIT_MAX=30",
      "SHARE_RATE_LIMIT_WINDOW_SECONDS=60",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ]) {
      equal(env.includes(key), true, `${key} should be present`);
    }
  });
});
