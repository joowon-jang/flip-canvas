import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CANONICAL_CANVAS_SIZE } from "../drawing/canvas-constants";
import { frameDurationMs } from "../model/fps";
import { shadow, theme } from "../theme";
import type { FlipFrame } from "../types/flipbook";
import { NotebookPaper } from "./notebook-paper";
import { StrokePreview } from "./stroke-preview";

type LocalFlipPlayerProps = {
  frames: FlipFrame[];
  fps: number;
  size: number;
  autoPlay?: boolean;
};

export function LocalFlipPlayer({ frames, fps, size, autoPlay = true }: LocalFlipPlayerProps) {
  const safeFrames = useMemo(() => frames.filter(Boolean).sort((left, right) => left.index - right.index), [frames]);
  const [index, setIndex] = useState(0);
  const scale = size / CANONICAL_CANVAS_SIZE;
  const frame = safeFrames[index] ?? safeFrames[0];
  const frameDuration = frameDurationMs(fps);

  useEffect(() => {
    if (!autoPlay || safeFrames.length < 2) {
      return;
    }

    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % safeFrames.length);
    }, frameDuration);

    return () => clearInterval(interval);
  }, [autoPlay, frameDuration, safeFrames.length]);

  if (!frame) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text selectable style={styles.emptyText}>
          재생할 프레임이 없습니다.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.player, { width: size, height: size }]}>
      <NotebookPaper style={[styles.paper, { width: size, height: size }]}>
        <StrokePreview strokes={frame.strokes} scale={scale} renderMode="pressure-lite" pointsPerPressureSegment={4} eraserRenderMode="paint" />
      </NotebookPaper>
      <Text
        selectable={false}
        style={styles.counter}
      >
        {String(index + 1).padStart(3, "0")} / {String(safeFrames.length).padStart(3, "0")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: theme.color.muted,
  },
  player: {
    ...shadow,
  },
  paper: {
    backgroundColor: theme.color.paper,
  },
  counter: {
    position: "absolute",
    right: 12,
    top: 10,
    color: theme.color.muted,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
});
