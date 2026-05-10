import { deepEqual } from "node:assert/strict";

import { buildStrokeRenderLayers } from "../src/components/stroke-layering";
import type { Stroke } from "../src/types/flipbook";
import { describe, it } from "./harness";

function stroke(id: string, tool: Stroke["tool"]): Stroke {
  return {
    id,
    tool,
    color: "#111111",
    baseWidth: 5,
    createdAt: 1,
    points: [{ x: 1, y: 1, timestamp: 1, pressure: 0.5, pointerType: "touch", phase: "begin" }],
  };
}

function layerIds(layers: ReturnType<typeof buildStrokeRenderLayers>) {
  return layers.map((layer) => ({
    drawing: layer.drawingStrokes.map((item) => item.id),
    masks: layer.laterEraserStrokes.map((item) => item.id),
  }));
}

describe("stroke render layering", () => {
  it("does not let an older eraser mask pen strokes drawn after it", () => {
    const layers = buildStrokeRenderLayers([
      stroke("pen_1", "pen"),
      stroke("eraser_1", "eraser"),
      stroke("pen_2", "pen"),
      stroke("eraser_2", "eraser"),
      stroke("pen_3", "pen"),
    ]);

    deepEqual(layerIds(layers), [
      { drawing: ["pen_1"], masks: ["eraser_1", "eraser_2"] },
      { drawing: ["pen_2"], masks: ["eraser_2"] },
      { drawing: ["pen_3"], masks: [] },
    ]);
  });

  it("applies an active draft eraser as the latest mask for all committed drawing layers", () => {
    const layers = buildStrokeRenderLayers(
      [stroke("pen_1", "pen"), stroke("eraser_1", "eraser"), stroke("pen_2", "pen")],
      [stroke("draft_eraser", "eraser")],
    );

    deepEqual(layerIds(layers), [
      { drawing: ["pen_1"], masks: ["eraser_1", "draft_eraser"] },
      { drawing: ["pen_2"], masks: ["draft_eraser"] },
    ]);
  });
});
