import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("frame composite contract", () => {
  it("renders an immutable generated background before editable strokes", () => {
    const source = readFileSync(resolve("src/components/frame-composite.tsx"), "utf8");

    equal(source.indexOf("<Image") < source.indexOf("<StrokePreview"), true);
    equal(source.includes('eraserRenderMode={frame.background ? "mask" : "paint"}'), true);
    equal(source.includes("resolveFrameAssetUri(assetPath)"), true);
  });

  it("is shared by thumbnails and local playback", () => {
    const strip = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");
    const player = readFileSync(resolve("src/components/local-flip-player.tsx"), "utf8");

    equal(strip.includes("FrameComposite"), true);
    equal(player.includes("FrameComposite"), true);
  });
});
