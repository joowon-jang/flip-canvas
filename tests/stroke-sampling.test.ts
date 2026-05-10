import { equal } from "node:assert/strict";

import { appendSampledPoints, simplifyStrokePoints } from "../src/drawing/stroke-sampling";
import type { StylusPoint } from "../src/types/flipbook";
import { describe, it } from "./harness";

function point(x: number, y: number, phase: StylusPoint["phase"] = "move"): StylusPoint {
  return {
    x,
    y,
    phase,
    timestamp: 1000,
    pressure: 0.5,
    pointerType: "touch",
  };
}

describe("stroke input sampling", () => {
  it("drops near-duplicate move points before they reach SVG rendering", () => {
    const sampled = appendSampledPoints([point(0, 0, "begin")], [point(0.2, 0.2), point(3, 0)]);

    equal(sampled.length, 2);
    equal(sampled[1].x, 3);
  });

  it("always keeps stroke terminal points", () => {
    const sampled = appendSampledPoints([point(10, 10, "begin")], [point(10.1, 10.1, "end")]);

    equal(sampled.length, 2);
    equal(sampled[1].phase, "end");
  });

  it("appends into the existing draft array so long strokes do not copy on every input batch", () => {
    const existing = [point(0, 0, "begin")];

    const sampled = appendSampledPoints(existing, [point(3, 0)]);

    equal(sampled === existing, true);
    equal(existing.length, 2);
    equal(sampled.length, 2);
  });

  it("simplifies very long strokes while preserving the first and terminal points", () => {
    const points = Array.from({ length: 200 }, (_, index) => point(index, Math.sin(index / 4) * 8, "move"));
    points[0] = point(0, 0, "begin");
    points[199] = point(199, 0, "end");

    const simplified = simplifyStrokePoints(points, 40, 0.2);

    equal(simplified.length <= 40, true);
    equal(simplified[0], points[0]);
    equal(simplified[simplified.length - 1], points[199]);
  });
});
