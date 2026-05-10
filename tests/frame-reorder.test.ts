import { equal } from "node:assert/strict";

import { getDraggedFrameOffset, getFrameReorderPreview, getFrameReorderTargetIndexFromPoint, getGridReorderTargetIndex, getStripReorderTargetIndex } from "../src/components/frame-reorder";
import { describe, it } from "./harness";

describe("frame reorder target helpers", () => {
  it("maps horizontal strip drag distance to a clamped frame index", () => {
    equal(getStripReorderTargetIndex({ fromIndex: 1, frameCount: 5, itemSpan: 80, deltaX: 170, deltaY: 0, horizontal: true }), 3);
    equal(getStripReorderTargetIndex({ fromIndex: 1, frameCount: 5, itemSpan: 80, deltaX: -200, deltaY: 0, horizontal: true }), 0);
  });

  it("maps grid drag distance by columns while ignoring add thumbnails", () => {
    equal(getGridReorderTargetIndex({ fromIndex: 1, frameCount: 6, columns: 3, itemWidth: 80, itemHeight: 100, deltaX: 90, deltaY: 110 }), 5);
    equal(getGridReorderTargetIndex({ fromIndex: 4, frameCount: 6, columns: 3, itemWidth: 80, itemHeight: 100, deltaX: 240, deltaY: 120 }), 5);
  });

  it("keeps tiny movement on the source index", () => {
    equal(getStripReorderTargetIndex({ fromIndex: 2, frameCount: 5, itemSpan: 80, deltaX: 20, deltaY: 0, horizontal: true }), 2);
    equal(getGridReorderTargetIndex({ fromIndex: 2, frameCount: 5, columns: 3, itemWidth: 80, itemHeight: 100, deltaX: 20, deltaY: 20 }), 2);
  });

  it("previews reordered frames so neighbors shift out of the target position", () => {
    const frames = [
      { id: "a", index: 0 },
      { id: "b", index: 1 },
      { id: "c", index: 2 },
      { id: "d", index: 3 },
    ];

    equal(getFrameReorderPreview(frames, "a", 2).map((frame) => frame.id).join(","), "b,c,a,d");
    equal(getFrameReorderPreview(frames, "d", 1).map((frame) => frame.id).join(","), "a,d,b,c");
  });

  it("targets the occupied frame slot under the dragged pointer", () => {
    const slots = [
      { id: "a", index: 0, x: 0, y: 0, width: 70, height: 86 },
      { id: "b", index: 1, x: 80, y: 0, width: 70, height: 86 },
      { id: "c", index: 2, x: 160, y: 0, width: 70, height: 86 },
      { id: "d", index: 3, x: 0, y: 96, width: 70, height: 86 },
      { id: "__add-frame__", index: 4, x: 80, y: 96, width: 70, height: 86, reorderable: false },
    ];

    equal(getFrameReorderTargetIndexFromPoint({ slots, movingFrameId: "a", pointerX: 185, pointerY: 42 }), 2);
    equal(getFrameReorderTargetIndexFromPoint({ slots, movingFrameId: "a", pointerX: 24, pointerY: 128 }), 3);
    equal(getFrameReorderTargetIndexFromPoint({ slots, movingFrameId: "a", pointerX: 24, pointerY: 42 }), null);
    equal(getFrameReorderTargetIndexFromPoint({ slots, movingFrameId: "a", pointerX: 105, pointerY: 128 }), null);
  });

  it("keeps the dragged frame centered under the pointer after preview reorders it", () => {
    const startCenter = { x: 35, y: 43 };
    const movedSlot = { id: "a", index: 2, x: 160, y: 0, width: 70, height: 86 };

    const offset = getDraggedFrameOffset({
      dragStartCenter: startCenter,
      currentSlot: movedSlot,
      deltaX: 150,
      deltaY: 0,
    });

    equal(offset.x, -10);
    equal(offset.y, 0);
  });
});
