import { memo, useId, useMemo } from "react";
import {
  Canvas as SkiaCanvas,
  PaintStyle,
  Picture,
  Skia,
  StrokeCap,
  StrokeJoin,
  type SkPicture,
} from "@shopify/react-native-skia";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, Rect } from "react-native-svg";

import { CANONICAL_CANVAS_SIZE } from "../drawing/canvas-constants";
import { buildPressureStrokeSegments, buildStrokeDots } from "../drawing/pressure-stroke";
import { buildStrokePath } from "../drawing/stroke-path";
import type { Stroke } from "../types/flipbook";
import { buildStrokeRenderLayers } from "./stroke-layering";

type StrokePreviewProps = {
  strokes?: Stroke[];
  scale?: number;
  opacity?: number;
  renderMode?: "pressure" | "pressure-lite" | "simple";
  pointsPerPressureSegment?: number;
  cacheable?: boolean;
  maskStrokes?: Stroke[];
  eraserRenderMode?: "mask" | "paint";
};

type StrokePreviewPrewarmOptions = {
  scale: number;
  opacity?: number;
  renderMode: NonNullable<StrokePreviewProps["renderMode"]>;
  pointsPerPressureSegment: number;
  eraserRenderMode: NonNullable<StrokePreviewProps["eraserRenderMode"]>;
};

type StrokeRenderOptions = {
  scale: number;
  renderMode: NonNullable<StrokePreviewProps["renderMode"]>;
  pointsPerPressureSegment: number;
};

type StrokeRenderCommand =
  | {
      type: "circle";
      cx: number;
      cy: number;
      radius: number;
      color: string;
    }
  | {
      type: "path";
      path: string;
      strokeWidth: number;
      color: string;
      fill: boolean;
    };

const committedStrokeRenderCache = new WeakMap<Stroke, Map<string, StrokeRenderCommand[]>>();
const paintStrokePictureCache = new WeakMap<Stroke[], Map<string, SkPicture>>();
const EMPTY_STROKES: Stroke[] = [];
const PAPER_ERASER_COLOR = "#FCF8EF";

function paintEraserColor(): string {
  return PAPER_ERASER_COLOR;
}

function strokeColor(stroke: Stroke): string {
  return stroke.color;
}

function simpleStrokeWidth(stroke: Stroke, scale: number): number {
  return Math.max(1, stroke.baseWidth * scale);
}

function strokeRenderCacheKey({ scale, renderMode, pointsPerPressureSegment }: StrokeRenderOptions): string {
  return `${scale}:${renderMode}:${pointsPerPressureSegment}`;
}

function renderStrokeCommands(stroke: Stroke, options: StrokeRenderOptions): StrokeRenderCommand[] {
  const points = Array.isArray(stroke.points) ? stroke.points : [];
  if (points.length === 0) {
    return [];
  }

  const color = strokeColor(stroke);
  const dots = buildStrokeDots(stroke, options.scale);
  if (dots.length > 0) {
    return dots.map((dot) => ({
      type: "circle",
      cx: dot.cx,
      cy: dot.cy,
      radius: dot.radius,
      color,
    }));
  }

  if (options.renderMode === "simple") {
    return [
      {
        type: "path",
        path: buildStrokePath(points, options.scale),
        strokeWidth: simpleStrokeWidth(stroke, options.scale),
        fill: false,
        color,
      },
    ];
  }

  return buildPressureStrokeSegments(
    stroke,
    options.scale,
    options.renderMode === "pressure-lite" ? options.pointsPerPressureSegment : undefined,
  ).map((segment) => ({
    type: "path",
    path: segment.path,
    strokeWidth: segment.strokeWidth,
    fill: segment.fill,
    color,
  }));
}

function cacheStrokeRender(stroke: Stroke, options: StrokeRenderOptions, cacheable: boolean): StrokeRenderCommand[] {
  if (!cacheable) {
    return renderStrokeCommands(stroke, options);
  }

  const key = strokeRenderCacheKey(options);
  const committed = committedStrokeRenderCache.get(stroke);
  const cached = committed?.get(key);
  if (cached) {
    return cached;
  }

  const commands = renderStrokeCommands(stroke, options);
  const next = committed ?? new Map<string, StrokeRenderCommand[]>();
  next.set(key, commands);
  if (!committed) {
    committedStrokeRenderCache.set(stroke, next);
  }
  return commands;
}

function commandKey(stroke: Stroke, index: number, prefix: string): string {
  return `${prefix}-${stroke.id}-${index}`;
}

function renderCommand(command: StrokeRenderCommand, key: string, colorOverride?: string) {
  const color = colorOverride ?? command.color;
  if (command.type === "circle") {
    return (
      <Circle
        key={key}
        cx={command.cx}
        cy={command.cy}
        r={command.radius}
        fill={color}
      />
    );
  }

  return (
    <Path
      key={key}
      d={command.path}
      fill={command.fill ? color : "none"}
      stroke={command.fill ? "none" : color}
      strokeWidth={command.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function renderStrokeCommandsForLayer(
  stroke: Stroke,
  options: StrokeRenderOptions,
  cacheable: boolean,
  keyPrefix: string,
  colorOverride?: string,
) {
  return cacheStrokeRender(stroke, options, cacheable).map((command, index) =>
    renderCommand(command, commandKey(stroke, index, keyPrefix), colorOverride),
  );
}

function drawCommandToSkiaPicture(command: StrokeRenderCommand, color: string, canvas: ReturnType<ReturnType<typeof Skia.PictureRecorder>["beginRecording"]>) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));

  if (command.type === "circle") {
    paint.setStyle(PaintStyle.Fill);
    canvas.drawCircle(command.cx, command.cy, command.radius, paint);
    return;
  }

  const path = Skia.Path.MakeFromSVGString(command.path);
  if (!path) {
    return;
  }

  if (command.fill) {
    paint.setStyle(PaintStyle.Fill);
  } else {
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);
    paint.setStrokeWidth(command.strokeWidth);
  }
  canvas.drawPath(path, paint);
}

function renderPaintStrokePicture(strokes: Stroke[], options: StrokeRenderOptions, cacheable: boolean, canvasSize: number, opacity: number): SkPicture {
  const key = `${strokeRenderCacheKey(options)}:${canvasSize}:${opacity}`;
  if (cacheable) {
    const cached = paintStrokePictureCache.get(strokes);
    const cachedPicture = cached?.get(key);
    if (cachedPicture) {
      return cachedPicture;
    }
  }

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, canvasSize, canvasSize));
  if (opacity < 1) {
    const layerPaint = Skia.Paint();
    layerPaint.setAlphaf(opacity);
    canvas.saveLayer(layerPaint, Skia.XYWHRect(0, 0, canvasSize, canvasSize));
  }

  strokes.forEach((stroke) => {
    const color = stroke.tool === "eraser" ? paintEraserColor() : strokeColor(stroke);
    cacheStrokeRender(stroke, options, cacheable).forEach((command) => {
      drawCommandToSkiaPicture(command, color, canvas);
    });
  });

  if (opacity < 1) {
    canvas.restore();
  }
  const picture = recorder.finishRecordingAsPicture();
  if (cacheable) {
    const cached = paintStrokePictureCache.get(strokes);
    const next = cached ?? new Map<string, SkPicture>();
    next.set(key, picture);
    if (!cached) {
      paintStrokePictureCache.set(strokes, next);
    }
  }
  return picture;
}

export function prewarmStrokePreviewCache(strokes: Stroke[], options: StrokePreviewPrewarmOptions): void {
  const renderOptions = {
    scale: options.scale,
    renderMode: options.renderMode,
    pointsPerPressureSegment: options.pointsPerPressureSegment,
  };

  if (options.eraserRenderMode === "paint") {
    renderPaintStrokePicture(strokes, renderOptions, true, CANONICAL_CANVAS_SIZE * options.scale, options.opacity ?? 1);
    return;
  }

  for (const stroke of strokes) {
    cacheStrokeRender(stroke, renderOptions, true);
  }
}

function PaintStrokePreview({
  strokes,
  scale = 1,
  opacity = 1,
  renderMode = "pressure",
  pointsPerPressureSegment = 4,
  cacheable = true,
}: Pick<StrokePreviewProps, "strokes" | "scale" | "opacity" | "renderMode" | "pointsPerPressureSegment" | "cacheable">) {
  const safeStrokes = Array.isArray(strokes) ? strokes : EMPTY_STROKES;
  const canvasSize = CANONICAL_CANVAS_SIZE * scale;
  const renderOptions = useMemo(() => ({ scale, renderMode, pointsPerPressureSegment }), [pointsPerPressureSegment, renderMode, scale]);
  const picture = useMemo(
    () => renderPaintStrokePicture(safeStrokes, renderOptions, cacheable, canvasSize, opacity),
    [cacheable, canvasSize, opacity, renderOptions, safeStrokes],
  );

  return (
    <View pointerEvents="none" style={[styles.preview, { width: canvasSize, height: canvasSize }]}>
      <SkiaCanvas style={styles.skiaCanvas}>
        <Picture picture={picture} />
      </SkiaCanvas>
    </View>
  );
}

function MaskedStrokePreview({
  strokes,
  scale = 1,
  opacity = 1,
  renderMode = "pressure",
  pointsPerPressureSegment = 4,
  cacheable = true,
  maskStrokes,
}: Omit<StrokePreviewProps, "eraserRenderMode">) {
  const safeStrokes = Array.isArray(strokes) ? strokes : EMPTY_STROKES;
  const safeMaskStrokes = Array.isArray(maskStrokes) ? maskStrokes : EMPTY_STROKES;
  const canvasSize = CANONICAL_CANVAS_SIZE * scale;
  const renderOptions = useMemo(() => ({ scale, renderMode, pointsPerPressureSegment }), [pointsPerPressureSegment, renderMode, scale]);
  const maskId = `stroke_preview_mask_${useId().replace(/:/g, "_")}`;
  const activeMaskId = `${maskId}_active`;
  const layers = useMemo(() => buildStrokeRenderLayers(safeStrokes), [safeStrokes]);
  const activeMaskStrokes = useMemo(() => safeMaskStrokes.filter((stroke) => stroke.tool === "eraser"), [safeMaskStrokes]);
  const hasLayerMask = layers.some((layer) => layer.laterEraserStrokes.length > 0);
  const hasActiveMask = activeMaskStrokes.length > 0;
  const renderedLayers = useMemo(
    () =>
      layers.map((layer, layerIndex) => (
        <G
          key={`stroke-layer-${layerIndex}`}
          mask={layer.laterEraserStrokes.length > 0 ? `url(#${maskId}_${layerIndex})` : undefined}
        >
          {layer.drawingStrokes.map((stroke) => renderStrokeCommandsForLayer(stroke, renderOptions, cacheable, `stroke-${layerIndex}`))}
        </G>
      )),
    [cacheable, layers, maskId, renderOptions],
  );

  return (
    <View pointerEvents="none" style={[styles.preview, { width: canvasSize, height: canvasSize }]}>
      <Svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`}>
        {hasLayerMask || hasActiveMask ? (
          <Defs>
            {layers.map((layer, layerIndex) =>
              layer.laterEraserStrokes.length > 0 ? (
                <Mask
                  key={`${maskId}_${layerIndex}`}
                  id={`${maskId}_${layerIndex}`}
                  x={0}
                  y={0}
                  width={canvasSize}
                  height={canvasSize}
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                >
                  <Rect x={0} y={0} width={canvasSize} height={canvasSize} fill="#FFFFFF" />
                  {layer.laterEraserStrokes.map((stroke) =>
                    renderStrokeCommandsForLayer(
                      stroke,
                      renderOptions,
                      cacheable,
                      `laterEraserStrokes-${layerIndex}`,
                      "#000000",
                    ),
                  )}
                </Mask>
              ) : null,
            )}
            {hasActiveMask ? (
              <Mask
                id={activeMaskId}
                x={0}
                y={0}
                width={canvasSize}
                height={canvasSize}
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
              >
                <Rect x={0} y={0} width={canvasSize} height={canvasSize} fill="#FFFFFF" />
                {activeMaskStrokes.map((stroke) => renderStrokeCommandsForLayer(stroke, renderOptions, false, "activeMaskStrokes", "#000000"))}
              </Mask>
            ) : null}
          </Defs>
        ) : null}
        <G mask={hasActiveMask ? `url(#${activeMaskId})` : undefined} opacity={opacity}>
          {renderedLayers}
        </G>
      </Svg>
    </View>
  );
}

function StrokePreviewBase({ eraserRenderMode = "mask", ...props }: StrokePreviewProps) {
  if (eraserRenderMode === "paint") {
    return <PaintStrokePreview {...props} />;
  }

  return <MaskedStrokePreview {...props} />;
}

export const StrokePreview = memo(StrokePreviewBase);

const styles = StyleSheet.create({
  preview: {
    position: "absolute",
    inset: 0,
  },
  skiaCanvas: {
    flex: 1,
  },
});
