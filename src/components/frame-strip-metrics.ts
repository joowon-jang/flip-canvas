type FrameStripThumbnailMetricsInput = {
  horizontal: boolean;
  expanded: boolean;
  fillAvailable: boolean;
  viewportWidth: number;
  viewportHeight: number;
};

export type FrameStripThumbnailMetrics = {
  frameWidth: number;
  frameHeight: number;
  previewScale: number;
  stripGap: number;
  stripPadding: number;
};

type FrameGridMetricsInput = {
  viewportWidth: number;
};

export type FrameGridMetrics = {
  frameWidth: number;
  frameHeight: number;
  previewScale: number;
  gridGap: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getFrameStripThumbnailMetrics({
  horizontal,
  expanded,
  fillAvailable,
  viewportWidth,
  viewportHeight,
}: FrameStripThumbnailMetricsInput): FrameStripThumbnailMetrics {
  const stripPadding = fillAvailable ? 8 : expanded ? 11 : 10;
  const stripGap = expanded ? 10 : 8;

  if (!horizontal) {
    return {
      frameWidth: 72,
      frameHeight: 90,
      previewScale: 0.18,
      stripGap,
      stripPadding,
    };
  }

  const fallbackFrameHeight = expanded ? 96 : 72;
  const fallbackFrameWidth = expanded ? 76 : 58;
  const availableHeight = fillAvailable && viewportHeight > 0 ? Math.max(48, viewportHeight - stripPadding * 2) : fallbackFrameHeight;
  const widthScaledFrameWidth =
    viewportWidth > 0
      ? clamp(Math.round(viewportWidth * (expanded ? 0.18 : 0.14)), expanded ? 56 : 48, expanded ? 92 : 72)
      : fallbackFrameWidth;
  const heightFilledFrameHeight = clamp(availableHeight, expanded ? 80 : 60, expanded ? 144 : 104);
  const frameHeight = fillAvailable ? heightFilledFrameHeight : fallbackFrameHeight;
  const frameWidth = fillAvailable ? Math.max(widthScaledFrameWidth, Math.round(frameHeight * 0.79)) : fallbackFrameWidth;

  return {
    frameWidth,
    frameHeight,
    previewScale: Math.max(0.14, Math.min(0.24, frameHeight / 480)),
    stripGap,
    stripPadding,
  };
}

export function getFrameGridMetrics({ viewportWidth }: FrameGridMetricsInput): FrameGridMetrics {
  const safeWidth = Math.max(120, viewportWidth || 260);
  const gridGap = clamp(Math.round(safeWidth * 0.035), 10, 16);
  const contentWidth = Math.max(80, safeWidth - 20);
  const columns = clamp(Math.floor((contentWidth + gridGap) / (62 + gridGap)), 1, 4);
  const frameWidth = clamp(Math.floor((contentWidth - gridGap * (columns - 1)) / columns), 58, 92);
  const frameHeight = Math.round(frameWidth * 1.24);

  return {
    frameWidth,
    frameHeight,
    previewScale: Math.max(0.14, Math.min(0.22, frameWidth / 400)),
    gridGap,
  };
}
