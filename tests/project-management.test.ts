import { deepEqual, equal, notEqual } from "node:assert/strict";

import { duplicateProjectForManagement, renameProjectForManagement } from "../src/model/project-management";
import type { FlipProject } from "../src/types/flipbook";
import { describe, it } from "./harness";

const project: FlipProject = {
  id: "project-1",
  title: "원본",
  fps: 12,
  createdAt: 10,
  updatedAt: 20,
  shareId: "share-1",
  shareUrl: "https://example.com/v/share-1",
  frames: [
    {
      id: "frame-1",
      index: 0,
      updatedAt: 21,
      strokes: [
        {
          id: "stroke-1",
          tool: "pen",
          color: "#171717",
          baseWidth: 5,
          createdAt: 22,
          points: [{ x: 1, y: 2, timestamp: 3, pressure: 0.5, pointerType: "touch", phase: "begin" }],
        },
      ],
    },
  ],
};

describe("project management helpers", () => {
  it("renames a project while preserving frames and share metadata", () => {
    const renamed = renameProjectForManagement(project, "  새 이름  ", 99);

    equal(renamed.title, "새 이름");
    equal(renamed.updatedAt, 99);
    equal(renamed.frames, project.frames);
    equal(renamed.shareId, project.shareId);
    equal(renamed.shareUrl, project.shareUrl);
  });

  it("duplicates a project with new ids and without copied share links", () => {
    let idIndex = 0;
    const duplicated = duplicateProjectForManagement(project, () => `copy-${++idIndex}`, 100);

    equal(duplicated.title, "원본 복사본");
    equal(duplicated.createdAt, 100);
    equal(duplicated.updatedAt, 100);
    equal(duplicated.shareId, undefined);
    equal(duplicated.shareUrl, undefined);
    notEqual(duplicated.id, project.id);
    notEqual(duplicated.frames[0].id, project.frames[0].id);
    notEqual(duplicated.frames[0].strokes[0].id, project.frames[0].strokes[0].id);
    equal(duplicated.frames[0].index, 0);
    notEqual(duplicated.frames[0].strokes[0].points, project.frames[0].strokes[0].points);
    deepEqual(duplicated.frames[0].strokes[0].points, project.frames[0].strokes[0].points);
  });
});
