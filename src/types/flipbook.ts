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

export type FlipFrame = {
  id: string;
  index: number;
  strokes: Stroke[];
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
  shareId?: string;
  shareUrl?: string;
};

export type ProjectSummary = {
  id: string;
  title: string;
  fps: number;
  frameCount: number;
  previewFrame?: FlipFrame;
  createdAt: number;
  updatedAt: number;
  shareId?: string;
  shareUrl?: string;
};

export type ShareManifestFrame = {
  index: number;
  url: string;
};

export type ShareManifest = {
  id: string;
  title: string;
  fps: number;
  frameCount: number;
  createdAt: number;
  frames: ShareManifestFrame[];
};
