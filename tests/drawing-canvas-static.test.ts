import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("drawing canvas performance contract", () => {
  it("keeps a committed stroke in local pending preview before project state catches up", () => {
    const source = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(source.includes("pendingCommittedStrokes"), true);
    equal(source.includes("setPendingCommittedStrokes"), true);
    equal(source.indexOf("setPendingCommittedStrokes(pendingCommittedStrokesRef.current)") < source.indexOf("onCommitStroke(committedStroke)"), true);
  });

  it("snapshots draft points at render boundaries and reuses committed stroke ids", () => {
    const source = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(source.includes("const nextPoints"), true);
    equal(source.includes(": [...current.points]"), true);
    equal(source.includes("setDraft({ ...current, points: nextPoints })"), true);
    equal(source.includes("committedStrokeIds"), true);
    equal(source.includes("simplifyStrokePoints"), true);
  });

  it("renders active eraser movement immediately through fast paint mode instead of masking committed strokes", () => {
    const source = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(source.includes('draft && draft.tool === "eraser"'), true);
    equal(source.includes('eraserRenderMode="paint"'), true);
    equal(source.includes("cacheable={false}"), true);
    equal(source.includes("draftEraserStrokes"), false);
    equal(source.includes("maskStrokes={draftEraserStrokes}"), false);
  });

  it("lets eraser draft reuse its mutable points array for immediate paint preview", () => {
    const source = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(source.includes('current.tool === "eraser"'), true);
    equal(source.includes("? current.points"), true);
    equal(source.includes(": [...current.points]"), true);
  });

  it("uses fast paint-mode eraser rendering on the isolated current frame layer", () => {
    const source = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(source.includes('eraserRenderMode="paint"'), true);
    equal(source.indexOf('eraserRenderMode="paint"') < source.indexOf("onionFrame.strokes"), true);
  });

  it("renders onion skin with the same pressure-lite stroke renderer as the current frame", () => {
    const source = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(source.includes("onionFrame.strokes"), true);
    equal(source.includes('renderMode="simple"'), false);
    equal(source.includes('renderMode="pressure-lite"'), true);
    equal(source.includes("pointsPerPressureSegment={4}"), true);
  });

  it("takes onion skin opacity from props instead of a fixed constant", () => {
    const source = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(source.includes("onionOpacity"), true);
    equal(source.includes("opacity={onionOpacity}"), true);
    equal(source.includes("opacity={0.24}"), false);
  });

  it("does not render a bottom-right corner decoration on the drawing canvas", () => {
    const source = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(source.includes("<NotebookPaper fold={false}"), true);
    equal(source.includes("cornerGuide"), false);
  });
});
