import { equal } from "node:assert/strict";

import { FPS_MAX, FPS_MIN, normalizeFps, parseFpsText } from "../src/model/fps";
import { describe, it } from "./harness";

describe("fps values", () => {
  it("keeps direct numeric FPS values within the supported range", () => {
    equal(FPS_MIN, 1);
    equal(FPS_MAX, 60);
    equal(normalizeFps(17), 17);
    equal(normalizeFps(12.6), 13);
    equal(normalizeFps(0), 1);
    equal(normalizeFps(99), 60);
    equal(normalizeFps(Number.NaN), 12);
  });

  it("parses direct FPS input text", () => {
    equal(parseFpsText("24", 12), 24);
    equal(parseFpsText("120", 12), 60);
    equal(parseFpsText("", 18), 18);
  });
});
