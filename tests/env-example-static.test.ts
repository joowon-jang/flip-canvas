import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("environment example contract", () => {
  it("documents every env required by rewarded interpolation", () => {
    const env = readFileSync(resolve(".env.example"), "utf8");

    for (const key of [
      "FAL_KEY",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "ADMOB_SSV_ALLOWED_AD_UNITS",
      "PRIVACY_CONTACT_EMAIL",
      "AI_DAILY_CLIENT_LIMIT=20",
      "AI_DAILY_GLOBAL_LIMIT=100",
      "AI_MAX_IMAGE_BYTES=1048576",
      "EXPO_PUBLIC_API_BASE_URL",
      "EXPO_PUBLIC_ADMOB_IOS_REWARDED_AD_UNIT_ID",
      "EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_AD_UNIT_ID",
    ]) {
      equal(env.includes(key), true, `${key} should be present`);
    }
  });
});
