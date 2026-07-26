import type { FlipFrame, FlipProject, FrameBackground, Stroke } from "../types/flipbook";
import { normalizeFps } from "./fps";

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function sanitizeStrokes(value: unknown): Stroke[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((stroke): stroke is Stroke => Boolean(stroke) && typeof stroke === "object")
    .map((stroke) => ({
      ...stroke,
      id: stringOr((stroke as Partial<Stroke>).id, `stroke_${Date.now()}`),
      tool: (stroke as Partial<Stroke>).tool === "eraser" ? "eraser" : "pen",
      color: stringOr((stroke as Partial<Stroke>).color, "#171717"),
      baseWidth: numberOr((stroke as Partial<Stroke>).baseWidth, 4),
      points: Array.isArray((stroke as Partial<Stroke>).points) ? (stroke as Stroke).points : [],
      createdAt: numberOr((stroke as Partial<Stroke>).createdAt, Date.now()),
    }));
}

function sanitizeBackground(value: unknown): FrameBackground | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const source = value as Partial<FrameBackground>;
  if (
    typeof source.assetPath !== "string" ||
    source.assetPath.length === 0 ||
    source.source !== "rife" ||
    source.model !== "fal-ai/rife" ||
    !Array.isArray(source.sourceFrameIds) ||
    source.sourceFrameIds.length !== 2 ||
    source.sourceFrameIds.some((id) => typeof id !== "string") ||
    typeof source.time !== "number" ||
    !Number.isFinite(source.time) ||
    typeof source.generatedAt !== "number" ||
    !Number.isFinite(source.generatedAt)
  ) {
    return undefined;
  }

  return {
    assetPath: source.assetPath,
    source: "rife",
    model: "fal-ai/rife",
    sourceFrameIds: [source.sourceFrameIds[0], source.sourceFrameIds[1]],
    time: Math.max(0, Math.min(1, source.time)),
    generatedAt: source.generatedAt,
  };
}

function sanitizeFrames(value: unknown, updatedAt: number): FlipFrame[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      {
        id: `frame_${Date.now()}_1`,
        index: 0,
        strokes: [],
        updatedAt,
      },
    ];
  }

  return value
    .filter((frame): frame is Partial<FlipFrame> => Boolean(frame) && typeof frame === "object")
    .map((frame, index) => {
      const sanitized: FlipFrame = {
        id: stringOr(frame.id, `frame_${Date.now()}_${index + 1}`),
        index,
        strokes: sanitizeStrokes(frame.strokes),
        updatedAt: numberOr(frame.updatedAt, updatedAt),
      };
      if (typeof frame.thumbnailUri === "string") {
        sanitized.thumbnailUri = frame.thumbnailUri;
      }
      const background = sanitizeBackground(frame.background);
      if (background) {
        sanitized.background = background;
      }
      return sanitized;
    });
}

export function sanitizeProject(value: unknown): FlipProject {
  const source = Boolean(value) && typeof value === "object" ? (value as Partial<FlipProject>) : {};
  const updatedAt = numberOr(source.updatedAt, Date.now());

  return {
    id: stringOr(source.id, `project_${Date.now()}`),
    title: stringOr(source.title, "새 플립북"),
    fps: normalizeFps(source.fps),
    frames: sanitizeFrames(source.frames, updatedAt),
    createdAt: numberOr(source.createdAt, updatedAt),
    updatedAt,
  };
}
