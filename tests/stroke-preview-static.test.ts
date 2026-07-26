import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("stroke preview render cache contract", () => {
  it("caches committed stroke render output while keeping draft strokes uncached", () => {
    const source = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");
    const canvasSource = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(source.includes("committed"), true);
    equal(source.includes("WeakMap"), true);
    equal(source.includes("cacheStrokeRender"), true);
    equal(canvasSource.includes("cacheable={false}"), true);
  });

  it("renders eraser strokes as a local mask instead of paper-colored paint", () => {
    const source = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");
    const layeringSource = readFileSync(resolve("src/components/stroke-layering.ts"), "utf8");

    equal(source.includes("Mask"), true);
    equal(source.includes("maskStrokes"), true);
    equal(source.includes('stroke.tool === "eraser" ? "#FCF8EF"'), false);
    equal(layeringSource.includes('stroke.tool === "eraser"'), true);
  });

  it("keeps active eraser preview outside the expensive committed stroke mask path", () => {
    const canvasSource = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(canvasSource.includes('draft && draft.tool === "eraser"'), true);
    equal(canvasSource.includes('eraserRenderMode="paint"'), true);
    equal(canvasSource.includes("maskStrokes={draftEraserStrokes}"), false);
    equal(canvasSource.includes('draft && draft.tool !== "eraser"'), true);
  });

  it("keeps pen strokes drawn after an eraser outside older eraser masks", () => {
    const source = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");

    equal(source.includes("buildStrokeRenderLayers"), true);
    equal(source.includes("laterEraserStrokes"), true);
    equal(source.includes("const eraserStrokes"), false);
    equal(source.includes("const drawingStrokes"), false);
  });

  it("keeps eraser masks in explicit canvas coordinates", () => {
    const source = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");

    equal(source.includes('maskUnits="userSpaceOnUse"'), true);
    equal(source.includes('maskContentUnits="userSpaceOnUse"'), true);
    equal(source.includes("width={canvasSize}"), true);
    equal(source.includes("height={canvasSize}"), true);
  });

  it("keeps the active eraser draft as one latest mask without rebuilding committed layers", () => {
    const source = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");

    equal(source.includes("activeMaskStrokes"), true);
    equal(source.includes("activeMaskId"), true);
    equal(source.includes("renderedLayers"), true);
    equal(source.includes("buildStrokeRenderLayers(safeStrokes)"), true);
    equal(source.includes("buildStrokeRenderLayers(safeStrokes, safeMaskStrokes)"), false);
  });

  it("can render erasers as paint for performance-critical isolated frame layers", () => {
    const source = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");
    const canvasSource = readFileSync(resolve("src/drawing/drawing-canvas.tsx"), "utf8");

    equal(source.includes('eraserRenderMode?: "mask" | "paint"'), true);
    equal(source.includes("paintEraserColor"), true);
    equal(canvasSource.includes('eraserRenderMode="paint"'), true);
  });

  it("keeps paint-mode previews out of the mask layering code path", () => {
    const source = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");

    equal(source.includes("function PaintStrokePreview"), true);
    equal(source.includes("function MaskedStrokePreview"), true);
    equal(source.indexOf("function PaintStrokePreview") < source.indexOf("function MaskedStrokePreview"), true);
    equal(source.indexOf("function PaintStrokePreview"), source.lastIndexOf("function PaintStrokePreview"));
    equal(source.indexOf("const layers = useMemo(() => buildStrokeRenderLayers(safeStrokes)") > source.indexOf("function MaskedStrokePreview"), true);
  });

  it("renders paint-mode frames through one cached Skia picture instead of SVG path nodes", () => {
    const source = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");

    equal(source.includes("@shopify/react-native-skia"), true);
    equal(source.includes("paintStrokePictureCache"), true);
    equal(source.includes("WeakMap<Stroke[], Map<string, SkPicture>>"), true);
    equal(source.includes("renderPaintStrokePicture"), true);
    equal(source.includes("paintStrokePictureCache.set(strokes, next)"), true);
    equal(source.includes("<Picture picture={picture}"), true);
    equal(source.includes("SvgXml"), false);
  });

  it("applies paint-mode opacity through a Skia saveLayer so onion frames stay visually distinct without dotted overlaps", () => {
    const source = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");

    equal(source.includes("canvas.saveLayer"), true);
    equal(source.includes("canvas.restore()"), true);
    equal(source.includes("layerPaint.setAlphaf(opacity)"), true);
    equal(source.includes("paint.setAlphaf(opacity)"), false);
    equal(source.includes("drawCommandToSkiaPicture(command, color, opacity"), false);
  });

  it("fills pressure outlines instead of stroking layered pressure segments", () => {
    const previewSource = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");
    const pressureSource = readFileSync(resolve("src/drawing/pressure-stroke.ts"), "utf8");
    const uploadSource = readFileSync(resolve("src/share/upload-share.ts"), "utf8");

    equal(pressureSource.includes("buildPressureOutlinePath"), true);
    equal(pressureSource.includes("fill: true"), true);
    equal(previewSource.includes("command.fill"), true);
    equal(previewSource.includes("paint.setStyle(PaintStyle.Fill)"), true);
    equal(uploadSource.includes('fill="${color}"'), true);
  });

  it("exposes a cache prewarmer for large canvas frame selection", () => {
    const source = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");
    const drawSource = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("export function prewarmStrokePreviewCache"), true);
    equal(source.includes("renderPaintStrokePicture(strokes, renderOptions, true"), true);
    equal(drawSource.includes("prewarmStrokePreviewCache"), true);
    equal(drawSource.includes("project.frames.forEach((item) =>"), true);
  });
});
