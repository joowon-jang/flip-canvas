import { equal } from "node:assert/strict";

import { getFrameGridMetrics, getFrameStripThumbnailMetrics } from "../src/components/frame-strip-metrics";
import { describe, it } from "./harness";

function packedWidth(frameWidth: number, gap: number, columns: number): number {
  return frameWidth * columns + Math.max(0, columns - 1) * gap;
}

describe("frame strip responsive regression", () => {
  it("packs grid thumbnails within narrow landscape panels without clipping the row", () => {
    for (const viewportWidth of [150, 172, 196, 240, 320]) {
      const metrics = getFrameGridMetrics({ viewportWidth });
      const safeWidth = Math.max(120, viewportWidth);
      const contentWidth = Math.max(80, safeWidth - 20);
      const columns = Math.max(1, Math.floor((contentWidth + metrics.gridGap) / (metrics.frameWidth + metrics.gridGap)));

      equal(columns >= 1, true);
      equal(packedWidth(metrics.frameWidth, metrics.gridGap, columns) <= contentWidth, true);
    }
  });

  it("uses available horizontal strip height for larger thumbnails instead of leaving fixed blank space", () => {
    const short = getFrameStripThumbnailMetrics({
      horizontal: true,
      expanded: true,
      fillAvailable: true,
      viewportWidth: 320,
      viewportHeight: 104,
    });
    const tall = getFrameStripThumbnailMetrics({
      horizontal: true,
      expanded: true,
      fillAvailable: true,
      viewportWidth: 320,
      viewportHeight: 156,
    });

    equal(tall.frameHeight > short.frameHeight, true);
    equal(short.frameHeight <= 104 - short.stripPadding * 2, true);
    equal(tall.frameHeight <= 156 - tall.stripPadding * 2, true);
  });
});
