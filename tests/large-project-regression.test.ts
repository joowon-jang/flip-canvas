import { equal } from "node:assert/strict";

import { DEFAULT_MAX_STROKE_POINTS, simplifyStrokePoints } from "../src/drawing/stroke-sampling";
import { duplicateFrame, moveFrame, removeFrame } from "../src/model/frame-actions";
import { projectFromStorageRecords, projectSummaryFromRecords, projectToStorageRecords } from "../src/storage/project-records";
import type { FlipFrame, FlipProject, Stroke, StylusPoint } from "../src/types/flipbook";
import { describe, it } from "./harness";

function makeDensePoints(count: number, offset = 0): StylusPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    x: 24 + ((index * 7 + offset) % 440),
    y: 60 + Math.sin(index / 8) * 18 + index * 0.03,
    timestamp: index,
    pressure: 0.35 + (index % 9) * 0.05,
    pointerType: "stylus",
    phase: index === 0 ? "begin" : index === count - 1 ? "end" : "move",
  }));
}

function makeStroke(frameIndex: number, strokeIndex: number): Stroke {
  return {
    id: `stroke_${frameIndex}_${strokeIndex}`,
    tool: "pen",
    color: strokeIndex % 2 === 0 ? "#171717" : "#114966",
    baseWidth: strokeIndex % 2 === 0 ? 4 : 6,
    createdAt: 1_000 + frameIndex * 10 + strokeIndex,
    points: simplifyStrokePoints(makeDensePoints(1_850, frameIndex * 5 + strokeIndex), DEFAULT_MAX_STROKE_POINTS),
  };
}

function makeLargeProject(frameCount: number): FlipProject {
  const frames: FlipFrame[] = Array.from({ length: frameCount }, (_, index) => ({
    id: `frame_${index + 1}`,
    index,
    updatedAt: 2_000 + index,
    thumbnailUri: index === 0 ? "file://preview-frame-1.svg" : undefined,
    strokes: [makeStroke(index, 0), makeStroke(index, 1)],
  }));

  return {
    id: "large_project",
    title: "large project",
    fps: 12,
    createdAt: 1_000,
    updatedAt: 3_000,
    frames,
  };
}

describe("large project regression", () => {
  it("round-trips 128 frames through separated project, frame, and stroke records", () => {
    const project = makeLargeProject(128);
    const records = projectToStorageRecords(project);
    const restored = projectFromStorageRecords(records.project, records.frames, records.strokes);
    const summary = projectSummaryFromRecords(records.project, records.frames.length, restored.frames[0]);

    equal(records.frames.length, 128);
    equal(records.strokes.length, 256);
    equal(restored.frames.length, 128);
    equal(restored.frames[0].strokes.length, 2);
    equal(restored.frames[127].index, 127);
    equal(restored.frames[0].strokes[0].points.length <= DEFAULT_MAX_STROKE_POINTS, true);
    equal(summary.frameCount, 128);
    equal(summary.previewFrame?.id, "frame_1");
  });

  it("keeps frame ownership and indexes stable after high-count reorder operations", () => {
    const project = makeLargeProject(64);
    const movedLastId = project.frames[63].id;
    let frames = moveFrame(project.frames, 63, 0);
    frames = duplicateFrame(frames, movedLastId, () => "frame_duplicate", () => 9_000);
    frames = removeFrame(frames, "frame_8");

    equal(frames.length, 64);
    equal(frames[0].id, movedLastId);
    equal(frames[1].id, "frame_duplicate");
    equal(frames.every((frame, index) => frame.index === index), true);
    equal(frames[1].strokes[0].id, project.frames[63].strokes[0].id);
    equal(frames[1].strokes[0].points === project.frames[63].strokes[0].points, false);
  });
});
