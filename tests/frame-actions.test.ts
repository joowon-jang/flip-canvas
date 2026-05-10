import { deepEqual, notStrictEqual } from "node:assert/strict";

import {
  addFrameAfter,
  addFrameToEnd,
  duplicateFrame,
  moveFrame,
  removeFrame,
} from "../src/model/frame-actions";
import type { FlipFrame } from "../src/types/flipbook";
import { describe, it } from "./harness";

function frame(id: string, index: number): FlipFrame {
  return { id, index, strokes: [], updatedAt: index };
}

describe("frame actions", () => {
  it("moves a frame and rewrites contiguous indexes", () => {
    const frames = [frame("a", 0), frame("b", 1), frame("c", 2), frame("d", 3)];

    const result = moveFrame(frames, 3, 1);

    deepEqual(result.map((item) => item.id), ["a", "d", "b", "c"]);
    deepEqual(result.map((item) => item.index), [0, 1, 2, 3]);
  });

  it("duplicates a frame with copied strokes after the source frame", () => {
    const source: FlipFrame = {
      id: "a",
      index: 0,
      updatedAt: 1,
      strokes: [
        {
          id: "stroke-a",
          tool: "pen",
          color: "#171717",
          baseWidth: 4,
          createdAt: 1,
          points: [
            {
              x: 10,
              y: 12,
              timestamp: 1,
              pressure: 0.7,
              pointerType: "pencil",
              phase: "begin",
            },
          ],
        },
      ],
    };

    const result = duplicateFrame([source, frame("b", 1)], "a", () => "new-id", () => 100);

    deepEqual(result.map((item) => item.id), ["a", "new-id", "b"]);
    deepEqual(result[1].strokes, source.strokes);
    notStrictEqual(result[1].strokes, source.strokes);
    deepEqual(result.map((item) => item.index), [0, 1, 2]);
  });

  it("does not remove the last remaining frame", () => {
    const frames = [frame("a", 0)];

    deepEqual(removeFrame(frames, "a"), frames);
  });

  it("adds an empty frame after the current frame", () => {
    const result = addFrameAfter([frame("a", 0), frame("b", 1)], "a", () => "new-id", () => 100);

    deepEqual(result.map((item) => item.id), ["a", "new-id", "b"]);
    deepEqual(result[1], { id: "new-id", index: 1, strokes: [], updatedAt: 100 });
  });

  it("adds an empty frame to the end regardless of the selected frame", () => {
    const result = addFrameToEnd([frame("a", 0), frame("b", 1)], () => "new-id", () => 100);

    deepEqual(result.map((item) => item.id), ["a", "b", "new-id"]);
    deepEqual(result[2], { id: "new-id", index: 2, strokes: [], updatedAt: 100 });
  });
});
