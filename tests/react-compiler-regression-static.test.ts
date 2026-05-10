import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("react compiler regression contract", () => {
  it("keeps drawing refs behind immutable render snapshots", () => {
    const canvas = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");
    const sampling = readFileSync(resolve("src/drawing/stroke-sampling.ts"), "utf8");

    equal(canvas.includes("const nextPoints"), true);
    equal(canvas.includes(": [...current.points]"), true);
    equal(canvas.includes("setDraft({ ...current, points: nextPoints })"), true);
    equal(canvas.includes("cacheable={false}"), true);
    equal(sampling.includes("Mutates the existing points array"), false);
  });

  it("keeps high-churn frame thumbnails memoized by primitive layout props and frame identity", () => {
    const frameStrip = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(frameStrip.includes("memo("), true);
    equal(frameStrip.includes("previous.frame === next.frame"), true);
    equal(frameStrip.includes("previous.width === next.width"), true);
    equal(frameStrip.includes("previous.height === next.height"), true);
    equal(frameStrip.includes("previous.previewScale === next.previewScale"), true);
  });

  it("keeps React Compiler enabled in Expo config", () => {
    const app = JSON.parse(readFileSync(resolve("app.json"), "utf8")) as {
      expo?: { experiments?: { reactCompiler?: boolean } };
    };

    equal(app.expo?.experiments?.reactCompiler, true);
  });
});
