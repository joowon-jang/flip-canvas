import { deepEqual, equal, throws } from "node:assert/strict";

import { insertGeneratedFrames, interpolationTimes } from "../src/model/interpolation";
import type { FlipFrame } from "../src/types/flipbook";
import { describe, it } from "./harness";

const frames: FlipFrame[] = [
  { id: "left", index: 0, strokes: [], updatedAt: 1 },
  { id: "right", index: 1, strokes: [], updatedAt: 2 },
  { id: "tail", index: 2, strokes: [], updatedAt: 3 },
];

describe("AI frame interpolation", () => {
  it("creates evenly spaced times for one to three generated frames", () => {
    deepEqual(interpolationTimes(1), [0.5]);
    deepEqual(interpolationTimes(2), [1 / 3, 2 / 3]);
    deepEqual(interpolationTimes(3), [0.25, 0.5, 0.75]);
    throws(() => interpolationTimes(0), RangeError);
    throws(() => interpolationTimes(4), RangeError);
  });

  it("inserts a generated batch only between an adjacent pair", () => {
    const inserted = insertGeneratedFrames(
      frames,
      "left",
      "right",
      [
        { id: "generated-1", assetPath: "projects/p/generated-1.png", time: 1 / 3, generatedAt: 10 },
        { id: "generated-2", assetPath: "projects/p/generated-2.png", time: 2 / 3, generatedAt: 11 },
      ],
    );

    deepEqual(inserted.map((frame) => frame.id), ["left", "generated-1", "generated-2", "right", "tail"]);
    deepEqual(inserted.map((frame) => frame.index), [0, 1, 2, 3, 4]);
    equal(inserted[1].background?.source, "rife");
    deepEqual(inserted[1].background?.sourceFrameIds, ["left", "right"]);
    equal(inserted[1].background?.time, 1 / 3);
    throws(() => insertGeneratedFrames(frames, "left", "tail", []), /adjacent/);
  });
});
