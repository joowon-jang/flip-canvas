import { deepEqual, equal, ok } from "node:assert/strict";

import { buildPressureStrokeSegments, buildStrokeDots } from "../src/drawing/pressure-stroke";
import type { Stroke } from "../src/types/flipbook";
import { describe, it } from "./harness";

function stroke(points: Stroke["points"], baseWidth = 10): Stroke {
  return {
    id: "s1",
    tool: "pen",
    color: "#171717",
    baseWidth,
    createdAt: 1,
    points,
  };
}

describe("pressure stroke rendering", () => {
  it("builds one filled pressure outline instead of layered adjacent stroke segments", () => {
    const segments = buildPressureStrokeSegments(
      stroke([
        { x: 0, y: 0, timestamp: 1, pressure: 0.1, pointerType: "pencil", phase: "begin" },
        { x: 10, y: 0, timestamp: 2, pressure: 0.8, pointerType: "pencil", phase: "move" },
        { x: 20, y: 0, timestamp: 3, pressure: 1, pointerType: "pencil", phase: "end" },
      ]),
      2,
    );

    equal(segments.length, 1);
    equal(segments[0].fill, true);
    equal(segments[0].strokeWidth, 0);
    ok(segments[0].path.startsWith("M 0.00"));
    ok(segments[0].path.endsWith("Z"));
  });

  it("turns single point strokes into visible dots", () => {
    const dots = buildStrokeDots(
      stroke([
        { x: 4, y: 6, timestamp: 1, pressure: 0.5, pointerType: "touch", phase: "begin" },
      ]),
      3,
    );

    deepEqual(dots, [{ cx: 12, cy: 18, radius: 7.5 }]);
  });

  it("amplifies raw stylus pressure ranges even when normalized pressure is clamped", () => {
    const segments = buildPressureStrokeSegments(
      stroke([
        { x: 0, y: 0, timestamp: 1, pressure: 1, rawPressure: 100, pointerType: "stylus", phase: "begin" },
        { x: 10, y: 0, timestamp: 2, pressure: 1, rawPressure: 150, pointerType: "stylus", phase: "move" },
        { x: 20, y: 0, timestamp: 3, pressure: 1, rawPressure: 200, pointerType: "stylus", phase: "end" },
      ]),
      1,
    );

    equal(segments.length, 1);
    equal(segments[0].fill, true);
    ok(segments[0].path.includes("6.75"));
  });

  it("does not change already-rendered outline start when later raw pressure expands the stroke range", () => {
    const firstOutline = buildPressureStrokeSegments(
      stroke([
        { x: 0, y: 0, timestamp: 1, pressure: 1, rawPressure: 100, pointerType: "stylus", phase: "begin" },
        { x: 10, y: 0, timestamp: 2, pressure: 1, rawPressure: 150, pointerType: "stylus", phase: "move" },
      ]),
      1,
    );
    const extendedOutline = buildPressureStrokeSegments(
      stroke([
        { x: 0, y: 0, timestamp: 1, pressure: 1, rawPressure: 100, pointerType: "stylus", phase: "begin" },
        { x: 10, y: 0, timestamp: 2, pressure: 1, rawPressure: 150, pointerType: "stylus", phase: "move" },
        { x: 20, y: 0, timestamp: 3, pressure: 1, rawPressure: 300, pointerType: "stylus", phase: "end" },
      ]),
      1,
    );

    equal(extendedOutline[0].path.startsWith(firstOutline[0].path.split(" L ")[0]), true);
  });

  it("smooths pressure changes inside one continuous outline", () => {
    const firstPoints = Array.from({ length: 6 }, (_, index) => ({
      x: index * 10,
      y: index % 2 === 0 ? 0 : 12,
      timestamp: index,
      pressure: 0.4 + index * 0.05,
      pointerType: "stylus" as const,
      phase: index === 0 ? "begin" as const : "move" as const,
    }));
    const extendedPoints = [
      ...firstPoints,
      { x: 60, y: 0, timestamp: 6, pressure: 0.8, pointerType: "stylus" as const, phase: "move" as const },
      { x: 70, y: 12, timestamp: 7, pressure: 0.9, pointerType: "stylus" as const, phase: "end" as const },
    ];
    const firstOutline = buildPressureStrokeSegments(stroke(firstPoints), 1, 3);
    const extendedOutline = buildPressureStrokeSegments(stroke(extendedPoints), 1, 3);

    equal(firstOutline.length, 1);
    equal(extendedOutline.length, 1);
    ok(firstOutline[0].path.includes("Q"));
    ok(extendedOutline[0].path.includes("Q"));
  });

  it("preserves width variation without splitting the stroke into visible bands", () => {
    const points = Array.from({ length: 80 }, (_, index) => ({
      x: index,
      y: 0,
      timestamp: index,
      pressure: index / 79,
      pointerType: "stylus" as const,
      phase: index === 0 ? "begin" as const : index === 79 ? "end" as const : "move" as const,
    }));
    const segments = buildPressureStrokeSegments(stroke(points), 1, 12);

    equal(segments.length, 1);
    equal(segments[0].fill, true);
    ok(segments[0].path.includes("M 0.00"));
    ok(segments[0].path.includes("79.00"));
  });

  it("keeps curved movement inside capped pressure segments", () => {
    const segments = buildPressureStrokeSegments(
      stroke([
        { x: 0, y: 0, timestamp: 1, pressure: 0.4, pointerType: "stylus", phase: "begin" },
        { x: 10, y: 20, timestamp: 2, pressure: 0.6, pointerType: "stylus", phase: "move" },
        { x: 20, y: 0, timestamp: 3, pressure: 0.8, pointerType: "stylus", phase: "end" },
      ]),
      1,
      3,
    );

    equal(segments.length, 1);
    equal(segments[0].fill, true);
    equal(segments[0].path.includes("Q"), true);
  });

  it("rounds pressure stroke caps instead of closing them with straight cut edges", () => {
    const segments = buildPressureStrokeSegments(
      stroke([
        { x: 0, y: 0, timestamp: 1, pressure: 1, pointerType: "stylus", phase: "begin" },
        { x: 20, y: 0, timestamp: 2, pressure: 1, pointerType: "stylus", phase: "end" },
      ]),
      1,
    );

    const arcCommands = segments[0].path.match(/\bA 5\.00 5\.00 0 0 0\b/g) ?? [];
    equal(arcCommands.length, 2);
  });
});
