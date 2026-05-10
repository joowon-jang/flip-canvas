import { deepEqual, equal } from "node:assert/strict";

import { sanitizeProject } from "../src/model/sanitize-project";
import { describe, it } from "./harness";

describe("sanitize project", () => {
  it("repairs frames that are missing strokes arrays", () => {
    const project = sanitizeProject({
      id: "p1",
      title: "Broken web project",
      fps: 17,
      createdAt: 1,
      updatedAt: 2,
      frames: [
        { id: "f1", index: 0, updatedAt: 2 },
        { id: "f2", index: 1, strokes: "bad", updatedAt: 2 },
      ],
    });

    equal(project.frames.length, 2);
    equal(project.fps, 17);
    deepEqual(project.frames[0].strokes, []);
    deepEqual(project.frames[1].strokes, []);
  });

  it("creates a valid one-frame project when stored data has no frames", () => {
    const project = sanitizeProject({
      id: "p1",
      title: "Broken web project",
      fps: 99,
      createdAt: 1,
      updatedAt: 2,
      frames: [],
    });

    equal(project.fps, 60);
    equal(project.frames.length, 1);
    deepEqual(project.frames[0].strokes, []);
  });
});
