import type { StylusPoint } from "@modules/stylus-input";

export type { PointerType, StylusBatchEvent, StylusPoint } from "@modules/stylus-input";

export type Stroke = {
  id: string;
  tool: "pen" | "eraser";
  color: string;
  baseWidth: number;
  points: StylusPoint[];
  createdAt: number;
};

export type FrameBackground = {
  assetPath: string;
  source: "rife";
  model: "fal-ai/rife";
  sourceFrameIds: [string, string];
  time: number;
  generatedAt: number;
};

export type FlipFrame = {
  id: string;
  index: number;
  strokes: Stroke[];
  background?: FrameBackground;
  thumbnailUri?: string;
  updatedAt: number;
};

export type FlipProject = {
  id: string;
  title: string;
  fps: number;
  frames: FlipFrame[];
  createdAt: number;
  updatedAt: number;
};

export type ProjectSummary = {
  id: string;
  title: string;
  fps: number;
  frameCount: number;
  previewFrame?: FlipFrame;
  createdAt: number;
  updatedAt: number;
};
