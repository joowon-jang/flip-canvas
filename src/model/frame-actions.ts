import type { FlipFrame } from "../types/flipbook";

type IdFactory = () => string;
type Clock = () => number;

function reindex(frames: FlipFrame[]): FlipFrame[] {
  return frames.map((frame, index) => ({ ...frame, index }));
}

function cloneFrame(frame: FlipFrame, id: string, updatedAt: number): FlipFrame {
  return {
    ...frame,
    id,
    updatedAt,
    background: frame.background
      ? {
          ...frame.background,
          sourceFrameIds: [...frame.background.sourceFrameIds],
        }
      : undefined,
    thumbnailUri: frame.thumbnailUri,
    strokes: frame.strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point })),
    })),
  };
}

export function moveFrame(frames: FlipFrame[], fromIndex: number, toIndex: number): FlipFrame[] {
  if (fromIndex === toIndex) {
    return reindex(frames);
  }

  if (fromIndex < 0 || fromIndex >= frames.length || toIndex < 0 || toIndex >= frames.length) {
    return reindex(frames);
  }

  const next = [...frames];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return reindex(next);
}

export function duplicateFrame(
  frames: FlipFrame[],
  frameId: string,
  createId: IdFactory,
  now: Clock,
): FlipFrame[] {
  const index = frames.findIndex((frame) => frame.id === frameId);
  if (index === -1) {
    return reindex(frames);
  }

  const duplicated = cloneFrame(frames[index], createId(), now());
  const next = [...frames];
  next.splice(index + 1, 0, duplicated);
  return reindex(next);
}

export function removeFrame(frames: FlipFrame[], frameId: string): FlipFrame[] {
  if (frames.length <= 1) {
    return frames;
  }

  return reindex(frames.filter((frame) => frame.id !== frameId));
}

export function addFrameAfter(
  frames: FlipFrame[],
  frameId: string,
  createId: IdFactory,
  now: Clock,
): FlipFrame[] {
  const sourceIndex = frames.findIndex((frame) => frame.id === frameId);
  const insertIndex = sourceIndex === -1 ? frames.length : sourceIndex + 1;
  const nextFrame: FlipFrame = {
    id: createId(),
    index: insertIndex,
    strokes: [],
    updatedAt: now(),
  };

  const next = [...frames];
  next.splice(insertIndex, 0, nextFrame);
  return reindex(next);
}

export function addFrameToEnd(
  frames: FlipFrame[],
  createId: IdFactory,
  now: Clock,
): FlipFrame[] {
  const nextFrame: FlipFrame = {
    id: createId(),
    index: frames.length,
    strokes: [],
    updatedAt: now(),
  };

  return reindex([...frames, nextFrame]);
}
