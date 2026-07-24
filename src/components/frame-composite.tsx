import { Image } from "expo-image";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { CANONICAL_CANVAS_SIZE } from "../drawing/canvas-constants";
import { resolveFrameAssetUri } from "../storage/frame-assets";
import type { FlipFrame } from "../types/flipbook";
import { NotebookPaper } from "./notebook-paper";
import { StrokePreview } from "./stroke-preview";

type FrameBackgroundLayerProps = {
  assetPath: string;
  size: number;
  opacity?: number;
};

export function FrameBackgroundLayer({ assetPath, size, opacity = 1 }: FrameBackgroundLayerProps) {
  return (
    <Image
      source={{ uri: resolveFrameAssetUri(assetPath) }}
      contentFit="cover"
      style={[styles.background, { width: size, height: size, opacity }]}
    />
  );
}

type FrameCompositeProps = {
  frame: FlipFrame;
  size: number;
  fold?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FrameComposite({ frame, size, fold = false, style }: FrameCompositeProps) {
  const scale = size / CANONICAL_CANVAS_SIZE;

  return (
    <NotebookPaper fold={fold} style={[styles.paper, { width: size, height: size }, style]}>
      {frame.background ? <FrameBackgroundLayer assetPath={frame.background.assetPath} size={size} /> : null}
      <StrokePreview
        strokes={frame.strokes}
        scale={scale}
        renderMode="pressure-lite"
        pointsPerPressureSegment={4}
        eraserRenderMode={frame.background ? "mask" : "paint"}
      />
    </NotebookPaper>
  );
}

const styles = StyleSheet.create({
  paper: {
    overflow: "hidden",
  },
  background: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
