import type { FlipProject, Stroke } from "../types/flipbook";
import { DEFAULT_FPS } from "./fps";

function sampleStroke(id: string, offset: number): Stroke {
  return {
    id,
    tool: "pen",
    color: "#171717",
    baseWidth: 4,
    createdAt: 1,
    points: [
      { x: 100 + offset, y: 205, timestamp: 1, pressure: 0.6, pointerType: "pencil", phase: "begin" },
      { x: 185 + offset, y: 162, timestamp: 2, pressure: 0.7, pointerType: "pencil", phase: "move" },
      { x: 145 + offset, y: 240, timestamp: 3, pressure: 0.7, pointerType: "pencil", phase: "end" },
    ],
  };
}

export function createInitialProject(): FlipProject {
  const createdAt = Date.now();
  return {
    id: "project_sample",
    title: "책상 모서리 달리기",
    fps: DEFAULT_FPS,
    createdAt,
    updatedAt: createdAt,
    frames: Array.from({ length: 6 }, (_, index) => ({
      id: `frame_sample_${index + 1}`,
      index,
      updatedAt: createdAt,
      strokes: [sampleStroke(`stroke_sample_${index + 1}`, index * 8)],
    })),
  };
}

export function createBlankProject(title: string): FlipProject {
  const createdAt = Date.now();
  return {
    id: `project_${createdAt}`,
    title: title.trim() || "새 플립북",
    fps: DEFAULT_FPS,
    createdAt,
    updatedAt: createdAt,
    frames: [
      {
        id: `frame_${createdAt}_1`,
        index: 0,
        strokes: [],
        updatedAt: createdAt,
      },
    ],
  };
}
