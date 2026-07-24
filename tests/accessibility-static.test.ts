import { equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("drawing controls accessibility contract", () => {
  it("labels tool dock controls and exposes selected state", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    ok(source.includes("accessibilityRole"));
    ok(source.includes("accessibilityState"));
    ok(source.includes("accessibilityLabel"));
    ok(source.includes("ToolOptionsPanel"));
  });

  it("labels expanded drawing sliders and color numeric inputs", () => {
    const sliderSource = readFileSync(resolve("src/components/value-slider.tsx"), "utf8");
    const colorSource = readFileSync(resolve("src/components/color-picker.tsx"), "utf8");

    ok(sliderSource.includes('accessibilityRole="adjustable"'));
    ok(sliderSource.includes("accessibilityValue"));
    ok(colorSource.includes('accessibilityLabel="색상 선택 영역"'));
    ok(colorSource.includes('accessibilityLabel={`${channel.toUpperCase()} 값`}'));
  });

  it("labels frame thumbnails and exposes selected state", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    ok(source.includes("accessibilityLabel"));
    ok(source.includes("accessibilityState"));
    ok(source.includes("선택됨"));
  });

  it("exposes local render progress as a progressbar", () => {
    const source = readFileSync(resolve("app/project/[id]/render.tsx"), "utf8");

    ok(source.includes('accessibilityRole="progressbar"'));
    ok(source.includes("accessibilityValue"));
  });
});
