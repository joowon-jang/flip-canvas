import type { FlipFrame } from "../types/flipbook";

export type GeneratedFrameInput = {
  id: string;
  assetPath: string;
  time: number;
  generatedAt: number;
};

export function interpolationTimes(count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > 3) {
    throw new RangeError("interpolation count must be between 1 and 3");
  }

  return Array.from({ length: count }, (_, index) => (index + 1) / (count + 1));
}

export function insertGeneratedFrames(
  frames: FlipFrame[],
  leftFrameId: string,
  rightFrameId: string,
  generated: GeneratedFrameInput[],
): FlipFrame[] {
  const leftIndex = frames.findIndex((frame) => frame.id === leftFrameId);
  if (leftIndex < 0 || frames[leftIndex + 1]?.id !== rightFrameId) {
    throw new Error("source frames must be adjacent");
  }

  const generatedFrames = generated.map<FlipFrame>((frame, offset) => ({
    id: frame.id,
    index: leftIndex + offset + 1,
    strokes: [],
    background: {
      assetPath: frame.assetPath,
      source: "rife",
      model: "fal-ai/rife",
      sourceFrameIds: [leftFrameId, rightFrameId],
      time: frame.time,
      generatedAt: frame.generatedAt,
    },
    updatedAt: frame.generatedAt,
  }));

  const next = [...frames];
  next.splice(leftIndex + 1, 0, ...generatedFrames);
  return next.map((frame, index) => ({ ...frame, index }));
}
