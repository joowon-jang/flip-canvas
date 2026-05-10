import type { Stroke } from "../types/flipbook";

export type StrokeRenderLayer = {
  drawingStrokes: Stroke[];
  laterEraserStrokes: Stroke[];
};

export function buildStrokeRenderLayers(strokes: Stroke[], maskStrokes: Stroke[] = []): StrokeRenderLayer[] {
  const layers: StrokeRenderLayer[] = [];
  const pendingDrawingStrokes: Stroke[] = [];
  let laterEraserStrokes = maskStrokes.filter((stroke) => stroke.tool === "eraser");

  for (let index = strokes.length - 1; index >= 0; index -= 1) {
    const stroke = strokes[index];
    if (stroke.tool === "eraser") {
      if (pendingDrawingStrokes.length > 0) {
        layers.push({
          drawingStrokes: [...pendingDrawingStrokes].reverse(),
          laterEraserStrokes,
        });
        pendingDrawingStrokes.length = 0;
      }
      laterEraserStrokes = [stroke, ...laterEraserStrokes];
      continue;
    }

    pendingDrawingStrokes.push(stroke);
  }

  if (pendingDrawingStrokes.length > 0) {
    layers.push({
      drawingStrokes: [...pendingDrawingStrokes].reverse(),
      laterEraserStrokes,
    });
  }

  return layers.reverse();
}
