type StripReorderTargetInput = {
  fromIndex: number;
  frameCount: number;
  itemSpan: number;
  deltaX: number;
  deltaY: number;
  horizontal: boolean;
};

type GridReorderTargetInput = {
  fromIndex: number;
  frameCount: number;
  columns: number;
  itemWidth: number;
  itemHeight: number;
  deltaX: number;
  deltaY: number;
};

export type FrameReorderSlot = {
  id: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  reorderable?: boolean;
};

type PointReorderTargetInput = {
  slots: FrameReorderSlot[];
  movingFrameId: string;
  pointerX: number;
  pointerY: number;
};

type DragPoint = {
  x: number;
  y: number;
};

type DraggedFrameOffsetInput = {
  dragStartCenter: DragPoint;
  currentSlot: FrameReorderSlot;
  deltaX: number;
  deltaY: number;
};

function clampIndex(value: number, frameCount: number): number {
  return Math.min(Math.max(value, 0), Math.max(0, frameCount - 1));
}

function getSlotCenter(slot: FrameReorderSlot): DragPoint {
  return {
    x: slot.x + slot.width / 2,
    y: slot.y + slot.height / 2,
  };
}

export function getFrameReorderPreview<T extends { id: string }>(frames: T[], movingFrameId: string | null, toIndex: number | null): T[] {
  if (!movingFrameId || toIndex === null) {
    return frames;
  }

  const fromIndex = frames.findIndex((frame) => frame.id === movingFrameId);
  if (fromIndex === -1) {
    return frames;
  }

  const clampedToIndex = clampIndex(toIndex, frames.length);
  if (fromIndex === clampedToIndex) {
    return frames;
  }

  const preview = [...frames];
  const [movingFrame] = preview.splice(fromIndex, 1);
  preview.splice(clampedToIndex, 0, movingFrame);
  return preview;
}

export function getStripReorderTargetIndex({ fromIndex, frameCount, itemSpan, deltaX, deltaY, horizontal }: StripReorderTargetInput): number {
  if (frameCount <= 0 || itemSpan <= 0) {
    return fromIndex;
  }

  const delta = horizontal ? deltaX : deltaY;
  return clampIndex(fromIndex + Math.round(delta / itemSpan), frameCount);
}

export function getGridReorderTargetIndex({ fromIndex, frameCount, columns, itemWidth, itemHeight, deltaX, deltaY }: GridReorderTargetInput): number {
  if (frameCount <= 0 || columns <= 0 || itemWidth <= 0 || itemHeight <= 0) {
    return fromIndex;
  }

  const columnDelta = Math.round(deltaX / itemWidth);
  const rowDelta = Math.round(deltaY / itemHeight);
  return clampIndex(fromIndex + rowDelta * columns + columnDelta, frameCount);
}

export function getFrameReorderTargetIndexFromPoint({ slots, movingFrameId, pointerX, pointerY }: PointReorderTargetInput): number | null {
  const targetSlot = slots.find((slot) => {
    if (slot.id === movingFrameId || slot.reorderable === false) {
      return false;
    }

    return pointerX >= slot.x && pointerX <= slot.x + slot.width && pointerY >= slot.y && pointerY <= slot.y + slot.height;
  });

  return targetSlot?.index ?? null;
}

export function getDraggedFrameOffset({ dragStartCenter, currentSlot, deltaX, deltaY }: DraggedFrameOffsetInput): DragPoint {
  const pointerCenter = {
    x: dragStartCenter.x + deltaX,
    y: dragStartCenter.y + deltaY,
  };
  const currentSlotCenter = getSlotCenter(currentSlot);

  return {
    x: pointerCenter.x - currentSlotCenter.x,
    y: pointerCenter.y - currentSlotCenter.y,
  };
}
