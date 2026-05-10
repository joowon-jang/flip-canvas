import { deepEqual } from "node:assert/strict";

import { createShareManifest } from "../src/share/manifest";
import type { FlipProject } from "../src/types/flipbook";
import { describe, it } from "./harness";

const project: FlipProject = {
  id: "project-1",
  title: "책상 모서리 달리기",
  fps: 17,
  frames: [
    { id: "f1", index: 0, strokes: [], thumbnailUri: "file:///f1.png", updatedAt: 1 },
    { id: "f2", index: 1, strokes: [], thumbnailUri: "file:///f2.png", updatedAt: 2 },
  ],
  createdAt: 1,
  updatedAt: 2,
};

describe("share manifest", () => {
  it("creates stable web player manifest frame URLs", () => {
    const manifest = createShareManifest(project, {
      shareId: "share-1",
      publicBaseUrl: "https://cdn.example.com",
      createdAt: 100,
    });

    deepEqual(manifest, {
      id: "share-1",
      title: "책상 모서리 달리기",
      fps: 17,
      frameCount: 2,
      createdAt: 100,
      frames: [
        { index: 0, url: "https://cdn.example.com/shares/share-1/frames/0001.svg" },
        { index: 1, url: "https://cdn.example.com/shares/share-1/frames/0002.svg" },
      ],
    });
  });
});
