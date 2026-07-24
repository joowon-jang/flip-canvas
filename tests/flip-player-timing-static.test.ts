import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as fpsModel from "../src/model/fps";
import { describe, it } from "./harness";

type FpsModelWithDuration = typeof fpsModel & {
  frameDurationMs?: (fps: number) => number;
};

describe("flip player timing", () => {
  it("derives frame duration directly from the selected FPS", () => {
    const { frameDurationMs } = fpsModel as FpsModelWithDuration;

    equal(typeof frameDurationMs, "function");
    if (typeof frameDurationMs !== "function") {
      return;
    }
    equal(frameDurationMs(12), 1000 / 12);
    equal(frameDurationMs(24), 1000 / 24);
    equal(frameDurationMs(60), 1000 / 60);
  });

  it("does not clamp preview playback to a high-FPS minimum interval", () => {
    const localPlayerSource = readFileSync(resolve("src/components/local-flip-player.tsx"), "utf8");
    const minimumIntervalClamp = /Math\.max\(\s*(?:90|120|140|180)\s*,\s*1000\s*\//;

    equal(minimumIntervalClamp.test(localPlayerSource), false);
  });

  it("shows whole frames in FPS order without transition animation", () => {
    const localPlayerSource = readFileSync(resolve("src/components/local-flip-player.tsx"), "utf8");

    for (const source of [localPlayerSource]) {
      equal(source.includes("setInterval"), true);
      equal(source.includes("frameDurationMs"), true);
      equal(source.includes("Animated"), false);
      equal(source.includes("progress.interpolate"), false);
      equal(source.includes("nextFrame"), false);
      equal(source.includes("styles.fold"), false);
    }
  });
});
