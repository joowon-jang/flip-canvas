import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("native stylus input contract", () => {
  it("tracks the active Android pointer instead of switching during a stroke", () => {
    const source = readFileSync(resolve("modules/stylus-input/android/src/main/java/expo/modules/stylusinput/StylusInputView.kt"), "utf8");

    equal(source.includes("activePointerId"), true);
    equal(source.includes("findPointerIndex(activePointerId)"), true);
    equal(source.includes("dispatchTouchEvent"), true);
    equal(source.includes("isClickable = true"), true);
    equal(source.includes("requestDisallowInterceptTouchEvent(true)"), true);
    equal(source.includes("MAX_HISTORICAL_POINTS = 4"), true);
    equal(source.includes("historicalStep"), true);
    equal(source.includes("resources.displayMetrics.density"), true);
    equal(source.includes('"x" to toDp(x)'), true);
    equal(source.includes('"y" to toDp(y)'), true);
    equal(source.includes("ACTION_HOVER"), true);
    equal(source.includes('"rawPressure"'), true);
    equal(source.includes("AXIS_PRESSURE"), true);
    equal(source.includes("normalizedPressure"), true);
    equal(source.includes("rawPressure > 0f) rawPressure"), false);
  });

  it("prefers Apple Pencil touches when iOS receives mixed touch sets", () => {
    const source = readFileSync(resolve("modules/stylus-input/ios/StylusInputView.swift"), "utf8");

    equal(source.includes("preferredTouch"), true);
    equal(source.includes("$0.type == .pencil"), true);
    equal(source.includes('"rawPressure"'), true);
  });

  it("keeps native input types owned by the local Expo module", () => {
    const moduleSource = readFileSync(resolve("modules/stylus-input/src/index.ts"), "utf8");
    const canvasSource = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(moduleSource.includes("../../../src/types/flipbook"), false);
    equal(moduleSource.includes("export type StylusPoint"), true);
    equal(canvasSource.includes("@modules/stylus-input"), true);
  });
});
