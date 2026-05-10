import { equal } from "node:assert/strict";

import { buildStrokePath } from "../src/drawing/stroke-path";
import type { StylusPoint } from "../src/types/flipbook";
import { describe, it } from "./harness";

function point(x: number, y: number): StylusPoint {
  return {
    x,
    y,
    timestamp: 1,
    pressure: 0.5,
    pointerType: "touch",
    phase: "move",
  };
}

describe("stroke path", () => {
  it("builds one continuous quadratic path from sampled points", () => {
    const path = buildStrokePath([point(0, 0), point(10, 0), point(20, 10), point(30, 20)], 1);

    equal(path, "M 0.00 0.00 Q 10.00 0.00 15.00 5.00 Q 20.00 10.00 25.00 15.00 L 30.00 20.00");
  });

  it("scales canonical canvas points for thumbnails", () => {
    const path = buildStrokePath([point(100, 120), point(140, 160)], 0.5);

    equal(path, "M 50.00 60.00 L 70.00 80.00");
  });
});
