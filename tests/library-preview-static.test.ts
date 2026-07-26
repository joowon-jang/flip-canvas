import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("library first frame preview", () => {
  it("renders the first frame preview from project summaries without loading full projects", () => {
    const source = readFileSync(resolve("app/index.tsx"), "utf8");
    const types = readFileSync(resolve("src/types/flipbook.ts"), "utf8");

    equal(source.includes("FrameComposite"), true);
    equal(source.includes("previewFrame={project.previewFrame}"), true);
    equal(source.includes("frame ? <FrameComposite"), true);
    equal(types.includes("previewFrame?: FlipFrame"), true);
  });

  it("falls back to loading the project first frame when a summary has no preview frame", () => {
    const source = readFileSync(resolve("app/index.tsx"), "utf8");

    equal(source.includes("useProject("), true);
    equal(source.includes("fallbackProject?.frames[0]"), true);
    equal(source.includes("const summaryPreviewHasStrokes = (previewFrame?.strokes.length ?? 0) > 0"), true);
    equal(source.includes("summaryPreviewHasStrokes ? previewFrame : fallbackProject?.frames[0] ?? previewFrame"), true);
  });

  it("navigates immediately to draw routes instead of holding on the library with opening feedback", () => {
    const source = readFileSync(resolve("app/index.tsx"), "utf8");

    equal(source.includes("OPEN_PROJECT_FEEDBACK_DELAY_MS"), false);
    equal(source.includes("openingProjectId"), false);
    equal(source.includes("여는 중"), false);
    equal(source.includes("router.push(`/project/${project.id}/draw`)"), true);
  });

  it("does not force the entry hero copy into a narrow fixed text column", () => {
    const source = readFileSync(resolve("app/index.tsx"), "utf8");

    equal(source.includes("maxWidth: 280"), false);
  });
});
