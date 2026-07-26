import { deepEqual, equal } from "node:assert/strict";

import { projectFromStorageRecords, projectToStorageRecords } from "../src/storage/project-records";
import type { FlipProject } from "../src/types/flipbook";
import { describe, it } from "./harness";

const project: FlipProject = {
  id: "p1",
  title: "demo",
  fps: 12,
  createdAt: 10,
  updatedAt: 20,
  shareId: "s1",
  shareUrl: "https://example.com/v/s1",
  frames: [
    {
      id: "f1",
      index: 0,
      updatedAt: 21,
      strokes: [
        {
          id: "st1",
          tool: "pen",
          color: "#111111",
          baseWidth: 5,
          createdAt: 22,
          points: [{ x: 1, y: 2, timestamp: 3, pressure: 0.5, pointerType: "touch", phase: "begin" }],
        },
      ],
    },
    { id: "f2", index: 1, updatedAt: 23, strokes: [] },
  ],
};

describe("project storage records", () => {
  it("round-trips a project through project, frame, and stroke records", () => {
    const records = projectToStorageRecords(project);
    const restored = projectFromStorageRecords(records.project, records.frames, records.strokes);

    equal(records.frames.length, 2);
    equal(records.strokes.length, 1);
    deepEqual(restored, project);
  });
});
