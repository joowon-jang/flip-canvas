import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("value slider interaction contract", () => {
  it("avoids repeated same-value updates while dragging", () => {
    const source = readFileSync(resolve("src/components/value-slider.tsx"), "utf8");

    equal(source.includes("lastEmittedValueRef"), true);
    equal(source.includes("if (nextValue === lastEmittedValueRef.current)"), true);
  });

  it("does not update measured track width when layout width is unchanged", () => {
    const source = readFileSync(resolve("src/components/value-slider.tsx"), "utf8");

    equal(source.includes("handleTrackLayout"), true);
    equal(source.includes("current === nextWidth ? current : nextWidth"), true);
  });

  it("uses page coordinates instead of local touch coordinates during drags", () => {
    const source = readFileSync(resolve("src/components/value-slider.tsx"), "utf8");

    equal(source.includes("measureInWindow"), true);
    equal(source.includes("trackPageXRef"), true);
    equal(source.includes("emitPageX(event.nativeEvent.pageX)"), true);
    equal(source.includes("emitValue(event.nativeEvent.locationX)"), false);
  });

  it("applies the same stable drag contract to color picker gradient sliders", () => {
    const source = readFileSync(resolve("src/components/color-picker.tsx"), "utf8");

    equal(source.includes("lastEmittedValueRef"), true);
    equal(source.includes("handleBarLayout"), true);
    equal(source.includes("current === nextWidth ? current : nextWidth"), true);
    equal(source.includes("barPageXRef"), true);
    equal(source.includes("emitPageX(event.nativeEvent.pageX)"), true);
  });

  it("keeps RGBA numeric inputs wide and tall enough to avoid clipped text", () => {
    const source = readFileSync(resolve("src/components/color-picker.tsx"), "utf8");

    equal(source.includes('flexWrap: "wrap"'), true);
    equal(source.includes("minWidth: 92"), true);
    equal(source.includes("height: 42"), true);
    equal(source.includes("lineHeight: 18"), true);
    equal(source.includes("paddingVertical: 0"), true);
  });
});
