import { equal } from "node:assert/strict";
import { describe, it } from "./harness";
import { getDrawCanvasSize, getDrawStudioLayout } from "../src/drawing/draw-layout";

function getLandscapeTestLayout(input: { width: number; height: number; surfaceTopPadding?: number; landscapeStudioHeight?: number }) {
  const layout = getDrawStudioLayout(input);
  if (layout.orientation !== "landscape") {
    throw new Error("Expected landscape layout");
  }
  return layout;
}

describe("draw canvas responsive layout", () => {
  it("keeps phone portrait canvas constrained by available width", () => {
    const layout = getDrawStudioLayout({ width: 393, height: 852 });

    equal(layout.orientation, "portrait");
    equal(layout.canvasSize, 345);
    equal(getDrawCanvasSize({ width: 393, height: 852 }), 345);
  });

  it("uses more vertical room on iPad mini portrait sizes", () => {
    equal(getDrawStudioLayout({ width: 612, height: 768 }).canvasSize, 380);
  });

  it("lets larger tablet portrait canvases use the available drawing space", () => {
    equal(getDrawStudioLayout({ width: 834, height: 1194 }).canvasSize, 786);
  });

  it("lets iPad Pro portrait canvases grow to the available width", () => {
    equal(getDrawStudioLayout({ width: 1024, height: 1366 }).canvasSize, 976);
  });

  it("uses the available tablet landscape width for canvas and frames panel", () => {
    const layout = getLandscapeTestLayout({ width: 1194, height: 834 });

    equal(layout.canvasSize, 670);
    equal(layout.sidePanelWidth, 330);
    equal(layout.frameGridWidth, 244);
    equal(layout.gap, 28);
    equal(layout.frameListMode, "grid");
  });

  it("expands iPad Pro landscape canvas while keeping the frames panel useful", () => {
    const layout = getLandscapeTestLayout({ width: 1366, height: 1024 });

    equal(layout.canvasSize, 834);
    equal(layout.toolRailWidth, 84);
    equal(layout.sidePanelWidth, 330);
    equal(layout.frameGridWidth, 244);
    equal(getDrawCanvasSize({ width: 1366, height: 1024 }), 834);
  });

  it("uses safe-area top padding on the first render so large landscape tablet canvases do not shift", () => {
    const layout = getLandscapeTestLayout({ width: 1280, height: 800, surfaceTopPadding: 40 });

    equal(layout.canvasSize, 660);
    equal(layout.sidePanelWidth, 420);
    equal(layout.panelContentWidth, 380);
    equal(layout.frameEditActionHeight, 36);
    equal(layout.frameListHeight, 482);
    equal(getDrawCanvasSize({ width: 1280, height: 800, surfaceTopPadding: 40 }), 660);
  });

  it("uses the full remaining width for short phone landscape panels", () => {
    const layout = getLandscapeTestLayout({ width: 915, height: 412 });

    equal(layout.canvasSize, 294);
    equal(layout.toolRailWidth, 64);
    equal(layout.sidePanelWidth, 449);
    equal(layout.frameGridWidth, 330);
    equal(layout.frameListMode, "strip");
    equal(layout.frameStripFillAvailable, true);
  });

  it("keeps Galaxy Z Fold 5 landscape as a short wide side-panel layout", () => {
    const layout = getLandscapeTestLayout({ width: 1114, height: 442 });

    equal(layout.canvasSize, 324);
    equal(layout.toolRailWidth, 70);
    equal(layout.sidePanelWidth, 602);
    equal(layout.frameListMode, "strip");
  });

  it("uses compact landscape layout for iPhone 12 Pro landscape instead of portrait stacking", () => {
    const layout = getLandscapeTestLayout({ width: 844, height: 390 });

    equal(layout.canvasSize, 272);
    equal(layout.toolRailWidth, 64);
    equal(layout.sidePanelWidth, 404);
    equal(layout.frameGridWidth, 330);
    equal(getDrawCanvasSize({ width: 844, height: 390 }), 272);
  });

  it("uses measured landscape studio height after rotation so panel actions stay visible", () => {
    const fallback = getLandscapeTestLayout({ width: 844, height: 390, surfaceTopPadding: 18 });
    const measured = getLandscapeTestLayout({ width: 844, height: 390, surfaceTopPadding: 18, landscapeStudioHeight: 220 });

    equal(fallback.canvasSize, 272);
    equal(fallback.frameListHeight, 118);
    equal(measured.canvasSize, 220);
    equal(measured.frameListHeight, 72);
  });

  it("reserves a selected-frame action row so landscape panel actions do not overflow", () => {
    const layout = getLandscapeTestLayout({ width: 2048, height: 1267, surfaceTopPadding: 40 });

    equal(layout.frameEditActionHeight, layout.actionButtonHeight);
    equal(
      layout.panelPadding +
        layout.panelPaddingBottom +
        32 +
        layout.frameListHeight +
        layout.frameEditActionHeight +
        layout.actionButtonHeight +
        layout.panelGap * 3 <=
        layout.canvasSize,
      true,
    );
  });

  it("uses a narrow side-panel landscape layout for 720 by 540 screens", () => {
    const layout = getLandscapeTestLayout({ width: 720, height: 540 });

    equal(layout.canvasSize, 347);
    equal(layout.toolRailWidth, 64);
    equal(layout.sidePanelWidth, 211);
    equal(layout.frameGridWidth, 158);
    equal(layout.gap, 18);
    equal(getDrawCanvasSize({ width: 720, height: 540 }), 347);
  });

  it("uses a compact row action bar when the panel can fit both action buttons", () => {
    const layout = getLandscapeTestLayout({ width: 720, height: 540 });

    equal(layout.actionDirection, "row");
    equal(layout.actionButtonHeight >= 32, true);
    equal(layout.actionButtonHeight <= 36, true);
    equal(layout.panelPaddingBottom < layout.panelPadding, true);
  });

  it("gives unused Galaxy S8+ landscape width to the frames panel without shrinking the canvas", () => {
    const layout = getLandscapeTestLayout({ width: 740, height: 360 });

    equal(layout.canvasSize, 242);
    equal(layout.toolRailWidth, 64);
    equal(layout.sidePanelWidth, 334);
    equal(layout.frameGridWidth, 244);
    equal(getDrawCanvasSize({ width: 740, height: 360 }), 242);
  });

  it("keeps landscape drawing usable across narrow aspect ratios", () => {
    equal(getDrawCanvasSize({ width: 568, height: 320 }), 202);
    equal(getDrawCanvasSize({ width: 640, height: 360 }), 242);
    equal(getDrawCanvasSize({ width: 720, height: 400 }), 282);
    equal(getDrawCanvasSize({ width: 800, height: 600 }), 398);
  });

  it("keeps a compact frames panel on very small widths while preserving the drawing canvas", () => {
    const layout = getLandscapeTestLayout({ width: 568, height: 320 });

    equal(layout.canvasSize, 202);
    equal(layout.toolRailWidth, 64);
    equal(layout.sidePanelWidth, 208);
    equal(layout.frameGridWidth, 158);
  });

  it("uses one adaptive landscape calculation instead of narrow and regular layout APIs", () => {
    const layout = getLandscapeTestLayout({ width: 740, height: 360 });

    equal(layout.orientation, "landscape");
    equal("sidePanelWidth" in layout, true);
    equal("frameListMode" in layout, true);
  });

  it("scales the landscape tool rail from the available parent width", () => {
    const narrow = getLandscapeTestLayout({ width: 640, height: 360 });
    const wide = getLandscapeTestLayout({ width: 1366, height: 1024 });

    equal("toolRailWidth" in narrow, true);
    equal(narrow.toolRailWidth < wide.toolRailWidth, true);
  });
});
