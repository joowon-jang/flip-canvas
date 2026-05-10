import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createBlankProject } from "../src/model/sample-data";
import { describe, it } from "./harness";

describe("fps selection flow", () => {
  it("creates new projects with a neutral default FPS and one starter frame", () => {
    const project = createBlankProject("새 프로젝트");

    equal(project.fps, 12);
    equal(project.frames.length, 1);
  });

  it("does not ask for FPS or frame count while creating a project", () => {
    const source = readFileSync(resolve("app/project/new/index.tsx"), "utf8");
    const modelSource = readFileSync(resolve("src/model/sample-data.ts"), "utf8");

    equal(source.includes("fpsOptions"), false);
    equal(source.includes("setFps"), false);
    equal(source.includes("createProject(title, fps"), false);
    equal(source.includes("FPS"), false);
    equal(source.includes("frameCount"), false);
    equal(source.includes("setFrameCount"), false);
    equal(source.includes("Number.parseInt"), false);
    equal(source.includes("시작 프레임"), false);
    equal(source.includes("createProject(title,"), false);
    equal(source.includes("createProject(title)"), true);
    equal(modelSource.includes("frameCount"), false);
    equal(modelSource.includes("safeFrameCount"), false);
  });

  it("keeps FPS UI only on preview and render screens", () => {
    const screensWithoutFpsUi = [
      "app/index.tsx",
      "app/project/new/index.tsx",
      "app/project/[id]/draw.tsx",
      "app/project/[id]/frames.tsx",
      "app/project/[id]/share.tsx",
      "app/v/[shareId]/index.tsx",
    ];

    for (const path of screensWithoutFpsUi) {
      const source = readFileSync(resolve(path), "utf8").toLowerCase();

      equal(source.includes("fps"), false, path);
    }
  });

  it("lets preview choose playback FPS", () => {
    const source = readFileSync(resolve("app/project/[id]/preview.tsx"), "utf8");

    equal(source.includes("FpsInput"), true);
    equal(source.includes("LocalFlipPlayer frames={project.frames} fps={fps}"), true);
  });

  it("uses the render screen FPS when uploading the share manifest", () => {
    const source = readFileSync(resolve("app/project/[id]/render.tsx"), "utf8");

    equal(source.includes("FpsInput"), true);
    equal(source.includes("const projectForUpload = { ...activeProject, fps }"), true);
    equal(source.includes("uploadProjectShare(projectForUpload"), true);
  });
});
