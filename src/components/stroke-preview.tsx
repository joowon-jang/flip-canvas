import { memo, useId, useMemo } from "react";
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

function strokeRenderCacheKey({
  scale,
  renderMode,
  pointsPerPressureSegment,
}: StrokeRenderOptions): string {
  const s = String(scale);
  const m = String(renderMode);
  const p = String(pointsPerPressureSegment);
  return `${s}:${m}:${p}`;
}

function renderStrokeCommands(
  stroke: Stroke,
  options: StrokeRenderOptions,
): StrokeRenderCommand[] {
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
    options.renderMode === "pressure-lite"
       ? options.pointsPerPressureSegment
       : undefined,
   ).map((segment) => ({
    type: "path",
    path: segment.path,
    strokeWidth: segment.strokeWidth,
    fill: segment.fill,
    color,
   }));
}

function cacheStrokeRender(
  stroke: Stroke,
  options: StrokeRenderOptions,
  cacheable: boolean,
): StrokeRenderCommand[] {
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

function commandKey(
  stroke: Stroke,
  index: number,
  prefix: string,
): string {
  const sid = typeof stroke.id === "string" ? stroke.id : String(stroke.id);
  return `${prefix}-${sid}-${index}`;
}

function renderCommand(
  command: StrokeRenderCommand,
  key: string,
  colorOverride?: string,
) {
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

const paintStrokeSvgCache = new WeakMap<Stroke[], Map<string, React.ReactNode[]>>();

function renderPaintStrokeSvg(
  strokes: Stroke[],
  options: StrokeRenderOptions,
  cacheable: boolean,
  canvasSize: number,
  opacity: number,
): React.ReactNode[] {
  const key = `${strokeRenderCacheKey(options)}:${canvasSize}:${opacity}`;
  if (cacheable) {
    const cached = paintStrokeSvgCache.get(strokes);
    const cachedElements = cached?.get(key);
    if (cachedElements) {
      return cachedElements;
     }
   }

  const elements: React.ReactNode[] = [];
  strokes.forEach((stroke, strokeIndex) => {
    const color =
      stroke.tool === "eraser" ? paintEraserColor() : strokeColor(stroke);
    cacheStrokeRender(stroke, options, cacheable).forEach(
       (command, commandIndex) => {
        elements.push(
           <G key={`stroke-${strokeIndex}-${commandIndex}`} opacity={opacity}>
             {renderCommand(
              command,
              commandKey(stroke, commandIndex, `paint-stroke-${strokeIndex}`),
              color,
             )}
           </G>,
         );
       },
     );
   });

  if (cacheable) {
    const cached = paintStrokeSvgCache.get(strokes);
    const next = cached ?? new Map<string, React.ReactNode[]>();
    next.set(key, elements);
    if (!cached) {
      paintStrokeSvgCache.set(strokes, next);
     }
   }

  return elements;
}

export function prewarmStrokePreviewCache(
  strokes: Stroke[],
  options: StrokePreviewPrewarmOptions,
): void {
  const renderOptions = {
    scale: options.scale,
    renderMode: options.renderMode,
    pointsPerPressureSegment: options.pointsPerPressureSegment,
   };

  if (options.eraserRenderMode === "paint") {
    renderPaintStrokeSvg(
      strokes,
      renderOptions,
      true,
      CANONICAL_CANVAS_SIZE * options.scale,
      options.opacity ?? 1,
     );
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
}: Pick<
  StrokePreviewProps,
   | "strokes"
   | "scale"
   | "opacity"
   | "renderMode"
   | "pointsPerPressureSegment"
   | "cacheable"
>) {
  const safeStrokes = Array.isArray(strokes) ? strokes : EMPTY_STROKES;
  const canvasSize = CANONICAL_CANVAS_SIZE * scale;
  const renderOptions = useMemo(
     () => ({ scale, renderMode, pointsPerPressureSegment }),
     [pointsPerPressureSegment, renderMode, scale],
   );
  const elements = useMemo(
     () =>
      renderPaintStrokeSvg(safeStrokes, renderOptions, cacheable, canvasSize, opacity),
     [cacheable, canvasSize, opacity, renderOptions, safeStrokes],
   );

  return (
     <View style={[styles.preview, { width: canvasSize, height: canvasSize }, { pointerEvents: "none" }]}>
       <Svg
        width={canvasSize}
        height={canvasSize}
        viewBox={`0 0 ${canvasSize} ${canvasSize}`}
       >
         {elements}
       </Svg>
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
  const safeMaskStrokes =
    Array.isArray(maskStrokes) ? maskStrokes : EMPTY_STROKES;
  const canvasSize = CANONICAL_CANVAS_SIZE * scale;
  const renderOptions = useMemo(
     () => ({ scale, renderMode, pointsPerPressureSegment }),
     [pointsPerPressureSegment, renderMode, scale],
   );
  const maskId = `stroke_preview_mask_${useId().replace(/:/g, "_")}`;
  const activeMaskId = `${maskId}_active`;
  const layers = useMemo(
     () => buildStrokeRenderLayers(safeStrokes),
     [safeStrokes],
   );
  const activeMaskStrokes = useMemo(
     () => safeMaskStrokes.filter((stroke) => stroke.tool === "eraser"),
     [safeMaskStrokes],
   );
  const hasLayerMask = layers.some(
     (layer) => layer.laterEraserStrokes.length > 0,
   );
  const hasActiveMask = activeMaskStrokes.length > 0;

  const renderedLayers = useMemo(() => {
    return layers.map((layer, layerIndex) => {
      return (
         <G
          key={`stroke-layer-${layerIndex}`}
          mask={
            layer.laterEraserStrokes.length > 0
               ? `url(#${maskId}_${layerIndex})`
               : undefined
           }
         >
           {layer.drawingStrokes.map((stroke) =>
            renderStrokeCommandsForLayer(
              stroke,
              renderOptions,
              cacheable,
               `stroke-${layerIndex}`,
             ),
           )}
         </G>
      );
    });
  }, [cacheable, layers, maskId, renderOptions]);

  return (
     <View style={[styles.preview, { width: canvasSize, height: canvasSize }, { pointerEvents: "none" }]}>
       <Svg
        width={canvasSize}
        height={canvasSize}
        viewBox={`0 0 ${canvasSize} ${canvasSize}`}
       >
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
                   <Rect
                    x={0}
                    y={0}
                    width={canvasSize}
                    height={canvasSize}
                    fill="#FFFFFF"
                   />
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
                 <Rect
                  x={0}
                  y={0}
                  width={canvasSize}
                  height={canvasSize}
                  fill="#FFFFFF"
                 />
                 {activeMaskStrokes.map((stroke) =>
                  renderStrokeCommandsForLayer(
                    stroke,
                    renderOptions,
                    false,
                     "activeMaskStrokes",
                     "#000000",
                   ),
                 )}
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

function StrokePreviewBase({
  eraserRenderMode = "mask",
  ...props
}: StrokePreviewProps) {
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
});
