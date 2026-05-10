import { equal } from "node:assert/strict";
import { describe, it } from "./harness";
import { getFrameGridMetrics, getFrameStripThumbnailMetrics } from "../src/components/frame-strip-metrics";

describe("frame strip metrics", () => {
  it("scales horizontal thumbnails from the measured parent width", () => {
    const compact = getFrameStripThumbnailMetrics({
      horizontal: true,
      expanded: true,
      fillAvailable: true,
      viewportWidth: 260,
      viewportHeight: 120,
    });
    const roomy = getFrameStripThumbnailMetrics({
      horizontal: true,
      expanded: true,
      fillAvailable: true,
      viewportWidth: 520,
      viewportHeight: 120,
    });

    equal(roomy.frameWidth > compact.frameWidth, true);
  });

  it("uses the available strip height before preserving more visible thumbnails", () => {
    const metrics = getFrameStripThumbnailMetrics({
      horizontal: true,
      expanded: true,
      fillAvailable: true,
      viewportWidth: 390,
      viewportHeight: 156,
    });

    equal(metrics.frameHeight >= 132, true);
  });

  it("scales grid thumbnails from the measured parent width", () => {
    const compact = getFrameGridMetrics({ viewportWidth: 180 });
    const roomy = getFrameGridMetrics({ viewportWidth: 420 });

    equal(roomy.frameWidth > compact.frameWidth, true);
    equal(roomy.gridGap >= compact.gridGap, true);
  });
});
