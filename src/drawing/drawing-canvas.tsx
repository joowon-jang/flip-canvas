import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";

import { StylusInputView, type NativeStylusBatchEvent, type StylusPoint } from "@modules/stylus-input";
import { theme } from "../theme";
import type { FlipFrame, Stroke } from "../types/flipbook";
import { NotebookPaper } from "../components/notebook-paper";
import { StrokePreview } from "../components/stroke-preview";
import { CANONICAL_CANVAS_SIZE } from "./canvas-constants";
import { appendSampledPoints, simplifyStrokePoints } from "./stroke-sampling";

type DrawingCanvasProps = {
  frame: FlipFrame;
  onionFrame?: FlipFrame;
  size: number;
  tool: "pen" | "eraser";
  color: string;
  brushSize: number;
  onionEnabled: boolean;
  onionOpacity: number;
  onCommitStroke: (stroke: Stroke) => void;
};

function normalizePoint(point: StylusPoint, displaySize: number): StylusPoint {
  const scale = CANONICAL_CANVAS_SIZE / displaySize;
  return {
    ...point,
    x: Math.max(0, Math.min(CANONICAL_CANVAS_SIZE, point.x * scale)),
    y: Math.max(0, Math.min(CANONICAL_CANVAS_SIZE, point.y * scale)),
    pressure: Number.isFinite(point.pressure) ? Math.max(0.05, Math.min(1, point.pressure)) : 0.5,
  };
}

function uncommittedStrokes(committedStrokeIds: Set<string>, pendingCommittedStrokes: Stroke[]): Stroke[] {
  if (pendingCommittedStrokes.length === 0) {
    return [];
  }

  return pendingCommittedStrokes.filter((stroke) => !committedStrokeIds.has(stroke.id));
}

function visibleStrokes(frameStrokes: Stroke[], pendingCommittedStrokes: Stroke[], committedStrokeIds: Set<string>): Stroke[] {
  const pending = uncommittedStrokes(committedStrokeIds, pendingCommittedStrokes);
  return pending.length > 0 ? [...frameStrokes, ...pending] : frameStrokes;
}

export function DrawingCanvas({
  frame,
  onionFrame,
  size,
  tool,
  color,
  brushSize,
  onionEnabled,
  onionOpacity,
  onCommitStroke,
}: DrawingCanvasProps) {
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [pendingCommittedStrokes, setPendingCommittedStrokes] = useState<Stroke[]>([]);
  const draftRef = useRef<Stroke | null>(null);
  const pendingCommittedStrokesRef = useRef<Stroke[]>([]);
  const draftRenderFrameRef = useRef<number | null>(null);
  const scale = size / CANONICAL_CANVAS_SIZE;
  const frameStrokes = Array.isArray(frame.strokes) ? frame.strokes : [];
  const committedStrokeIds = useMemo(() => new Set(frameStrokes.map((stroke) => stroke.id)), [frameStrokes]);
  const renderedFrameStrokes = useMemo(
    () => visibleStrokes(frameStrokes, pendingCommittedStrokes, committedStrokeIds),
    [committedStrokeIds, frameStrokes, pendingCommittedStrokes],
  );

  useEffect(() => {
    draftRef.current = null;
    pendingCommittedStrokesRef.current = [];
    setDraft(null);
    setPendingCommittedStrokes([]);
  }, [frame.id]);

  useEffect(() => {
    const nextPending = uncommittedStrokes(committedStrokeIds, pendingCommittedStrokesRef.current);
    if (nextPending.length !== pendingCommittedStrokesRef.current.length) {
      pendingCommittedStrokesRef.current = nextPending;
      setPendingCommittedStrokes(nextPending);
    }
  }, [committedStrokeIds]);

  useEffect(
    () => () => {
      if (draftRenderFrameRef.current !== null) {
        cancelAnimationFrame(draftRenderFrameRef.current);
      }
    },
    [],
  );

  const scheduleDraftRender = useCallback(() => {
    if (draftRenderFrameRef.current !== null) {
      return;
    }

    draftRenderFrameRef.current = requestAnimationFrame(() => {
      draftRenderFrameRef.current = null;
      const current = draftRef.current;
      if (!current) {
        setDraft(null);
        return;
      }
      const nextPoints =
        current.tool === "eraser"
          ? current.points
          : [...current.points];
      setDraft({ ...current, points: nextPoints });
    });
  }, []);

  const handleStylusBatch = useCallback(
    (event: NativeStylusBatchEvent) => {
      const points = event.nativeEvent.points.map((point) => normalizePoint(point, size));
      const first = points[0];
      if (!first) {
        return;
      }

      const current = draftRef.current;
      const shouldStart = first.phase === "begin" || !current || current.id !== event.nativeEvent.strokeId;
      const baseStroke: Stroke = shouldStart
        ? {
            id: event.nativeEvent.strokeId,
            tool,
            color,
            baseWidth: brushSize,
            createdAt: Date.now(),
            points: [],
          }
        : current;

      const pointCountBefore = baseStroke.points.length;
      const sampledPoints = appendSampledPoints(baseStroke.points, points);
      const shouldCommit = points.some((point) => point.phase === "end" || point.phase === "cancel");
      if (shouldCommit && sampledPoints.length > 0) {
        if (draftRenderFrameRef.current !== null) {
          cancelAnimationFrame(draftRenderFrameRef.current);
          draftRenderFrameRef.current = null;
        }
        const committedStroke = { ...baseStroke, points: simplifyStrokePoints(sampledPoints) };
        pendingCommittedStrokesRef.current = [...pendingCommittedStrokesRef.current, committedStroke];
        setPendingCommittedStrokes(pendingCommittedStrokesRef.current);
        draftRef.current = null;
        setDraft(null);
        onCommitStroke(committedStroke);
        return;
      }

      if (sampledPoints.length === pointCountBefore) {
        return;
      }

      draftRef.current = { ...baseStroke, points: sampledPoints };
      scheduleDraftRender();
    },
    [brushSize, color, onCommitStroke, scheduleDraftRender, size, tool],
  );

  return (
    <NotebookPaper fold={false} tapeLeft="primary" style={[styles.paper, { width: size, height: size }]}>
      <StrokePreview strokes={renderedFrameStrokes} scale={scale} renderMode="pressure-lite" pointsPerPressureSegment={4} eraserRenderMode="paint" />
      {draft && draft.tool === "eraser" ? (
        <StrokePreview strokes={[draft]} scale={scale} renderMode="pressure-lite" pointsPerPressureSegment={4} eraserRenderMode="paint" cacheable={false} />
      ) : null}
      {onionEnabled && onionFrame ? (
        <StrokePreview strokes={onionFrame.strokes} scale={scale} opacity={onionOpacity} renderMode="pressure-lite" pointsPerPressureSegment={4} eraserRenderMode="paint" />
      ) : null}
      {draft && draft.tool !== "eraser" ? (
        <StrokePreview strokes={[draft]} scale={scale} renderMode="pressure-lite" pointsPerPressureSegment={4} cacheable={false} />
      ) : null}
      <StylusInputView
        enabled
        onStylusBatch={handleStylusBatch}
        style={[styles.inputLayer, { width: size, height: size }]}
      />
    </NotebookPaper>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: theme.color.paper,
  },
  inputLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    backgroundColor: "transparent",
  },
});
