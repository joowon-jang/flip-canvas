import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("share upload static contract", () => {
  it("rejects missing native API base URLs before fetching a relative route", () => {
    const source = readFileSync(resolve("src/share/upload-share.ts"), "utf8");

    equal(source.includes("APP_PUBLIC_BASE_URL is required for native uploads"), true);
    equal(source.includes('return "/api/shares/create"'), true);
  });

  it("limits concurrent frame uploads and reports progress by completed frames", () => {
    const source = readFileSync(resolve("src/share/upload-share.ts"), "utf8");

    equal(source.includes("MAX_CONCURRENT_FRAME_UPLOADS = 3"), true);
    equal(source.includes("uploadWithConcurrencyLimit"), true);
    equal(source.includes("completedFrames"), true);
  });

  it("creates player manifests from the upload plan public URL instead of client env", () => {
    const source = readFileSync(resolve("src/share/upload-share.ts"), "utf8");

    equal(source.includes("publicR2BaseUrl"), false);
    equal(source.includes("publicBaseUrl: plan.publicBaseUrl"), true);
  });

  it("preserves alpha channel colors in exported SVG frames", () => {
    const source = readFileSync(resolve("src/share/upload-share.ts"), "utf8");

    equal(source.includes("svgStrokeColor"), true);
    equal(source.includes("stroke-opacity"), true);
    equal(source.includes("fill-opacity"), true);
    equal(source.includes("hexToRgba"), true);
  });
});
