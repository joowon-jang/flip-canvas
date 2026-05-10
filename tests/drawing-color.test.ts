import { deepEqual, equal } from "node:assert/strict";

import {
  alphaPercentToByte,
  hexToRgba,
  hsvToRgb,
  rgbaToHex8,
  rgbToHsv,
} from "../src/drawing/color";
import { describe, it } from "./harness";

describe("drawing color utilities", () => {
  it("parses legacy RGB hex and new RGBA hex colors", () => {
    deepEqual(hexToRgba("#143D59"), { r: 20, g: 61, b: 89, a: 255 });
    deepEqual(hexToRgba("#143D5980"), { r: 20, g: 61, b: 89, a: 128 });
  });

  it("serializes clamped RGBA channels to #RRGGBBAA", () => {
    equal(rgbaToHex8({ r: 20, g: 61, b: 89, a: 128 }), "#143D5980");
    equal(rgbaToHex8({ r: -4, g: 280, b: 12.4, a: 300 }), "#00FF0CFF");
  });

  it("converts alpha percent input to an alpha byte", () => {
    equal(alphaPercentToByte(-10), 0);
    equal(alphaPercentToByte(24), 61);
    equal(alphaPercentToByte(100), 255);
    equal(alphaPercentToByte(180), 255);
  });

  it("round-trips RGB and HSV for picker coordinates", () => {
    deepEqual(rgbToHsv({ r: 255, g: 0, b: 0 }), { h: 0, s: 100, v: 100 });
    deepEqual(hsvToRgb({ h: 120, s: 100, v: 50 }), { r: 0, g: 128, b: 0 });
  });
});
