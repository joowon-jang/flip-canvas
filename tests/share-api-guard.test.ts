import { deepEqual, equal, throws } from "node:assert/strict";

import {
  assertShareRateLimitConfigured,
  buildShareCorsHeaders,
  parseShareJsonBody,
  shareAllowedOrigins,
} from "../src/share/share-api-guard";
import { describe, it } from "./harness";

describe("share API guard", () => {
  it("uses explicit allowed origins before falling back to the app public origin", () => {
    deepEqual(
      shareAllowedOrigins({
        SHARE_ALLOWED_ORIGINS: "https://one.example.com, https://two.example.com/",
        APP_PUBLIC_BASE_URL: "https://app.example.com/v/abc",
      }),
      ["https://one.example.com", "https://two.example.com"],
    );

    deepEqual(
      shareAllowedOrigins({
        APP_PUBLIC_BASE_URL: "https://app.example.com/v/abc",
      }),
      ["https://app.example.com"],
    );
  });

  it("denies CORS for origins outside the allowlist", () => {
    const headers = buildShareCorsHeaders("https://bad.example.com", {
      APP_PUBLIC_BASE_URL: "https://app.example.com",
    });

    equal(headers["Access-Control-Allow-Origin"], "null");
  });

  it("rejects oversized request bodies before JSON parsing", () => {
    throws(
      () => parseShareJsonBody("{".padEnd(12, " "), { SHARE_MAX_BODY_BYTES: "8" }),
      /request body too large/,
    );
  });

  it("fails closed in production when durable rate limiting is not configured", () => {
    throws(
      () => assertShareRateLimitConfigured({ NODE_ENV: "production" }),
      /SHARE_RATE_LIMIT_PROVIDER is required in production/,
    );

    assertShareRateLimitConfigured({ NODE_ENV: "development" });
  });

  it("fails closed when production rate limiting uses an unsupported provider", () => {
    throws(
      () => assertShareRateLimitConfigured({ NODE_ENV: "production", SHARE_RATE_LIMIT_PROVIDER: "memory" }),
      /unsupported SHARE_RATE_LIMIT_PROVIDER/,
    );
  });
});
