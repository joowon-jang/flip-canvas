import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { equal } from "node:assert/strict";
import { describe, it } from "./harness";

describe("draw route layout contract", () => {
  it("does not import or render ScrollView", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("ScrollView"), false);
  });

  it("keeps static draw route styles in StyleSheet instead of inline style props", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("StyleSheet.create"), true);
    equal(source.includes("style={{"), false);
  });

  it("centers the non-landscape drawing canvas", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes('testID="canvas-stage"'), true);
    equal(source.includes('alignItems: "center"'), true);
  });

  it("uses one adaptive layout result instead of width-specific landscape branches", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("getDrawStudioLayout"), true);
    equal(source.includes("isNarrowLandscapeStudio"), false);
    equal(source.includes("isShortNarrowLandscape"), false);
    equal(source.includes("isShortWideLandscape"), false);
    equal(source.includes("getDrawLandscapeLayout"), false);
    equal(source.includes("getDrawNarrowLandscapeLayout"), false);
  });

  it("centers the adaptive landscape rail, canvas, and frame panel as a group", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("styles.landscapeStudio"), true);
    equal(source.includes("gap: layout.gap"), true);
    equal(source.includes("railWidth={layout.toolRailWidth}"), true);
    equal(source.includes('justifyContent: "center"'), true);
  });

  it("uses frame-list add thumbnails instead of header add buttons in landscape frame panels", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("addFrameToEnd"), true);
    equal(source.includes("function renderAddFrameButton"), false);
    equal(source.includes("styles.addFrameButton"), false);
    equal(source.includes("expanded={layout.frameStripExpanded}"), true);
    equal(source.includes("fillAvailable={layout.frameStripFillAvailable}"), true);
    equal(source.includes("onAdd={handleAddFrame}"), true);
    equal(source.includes('title="프레임 추가"'), false);
  });

  it("keeps landscape preview actions pinned to the frame panel bottom without status copy", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes('testID="landscape-panel-actions"'), true);
    equal(source.includes('marginTop: "auto"'), true);
    equal(source.includes("Auto-save on"), false);
    equal(source.includes('Onion {onionEnabled ? "35%" : "off"}'), false);
    equal(source.includes("Brush {brushSize}px"), false);
  });

  it("keeps stacked landscape action buttons narrower than the frame panel", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("styles.landscapeColumnActionButton"), true);
    equal(source.includes('width: "78%"'), true);
  });

  it("refreshes landscape layout from the measured studio height after orientation changes", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("useSafeAreaInsets"), true);
    equal(source.includes("surfaceTopPadding: Math.max(insets.top, 18)"), true);
    equal(source.includes("type LayoutChangeEvent"), true);
    equal(source.includes("landscapeStudioHeight:"), true);
    equal(source.includes("setLandscapeStudioFrame((current) =>"), true);
    equal(source.includes("current.windowWidth === width && current.windowHeight === height"), true);
    equal(source.includes("onLayout={handleLandscapeStudioLayout}"), true);
  });

  it("passes stable first-render dimensions into frame lists to avoid layout shift", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("viewportWidth={layout.panelContentWidth}"), true);
    equal(source.includes("viewportHeight={layout.frameListHeight}"), true);
    equal(source.includes("gridWidth={layout.panelContentWidth}"), true);
    equal(source.includes("gridHeight={layout.frameListHeight}"), true);
  });

  it("shows a route-local loading state before rendering cached heavy drawing content", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("InteractionManager"), true);
    equal(source.includes("initialRouteLoadingProjectId"), true);
    equal(source.includes("InteractionManager.runAfterInteractions"), true);
    equal(source.includes("if (!ready || initialRouteLoadingProjectId === id)"), true);
  });

  it("prewarms large canvas stroke caches before cached projects become interactive", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("prewarmStrokePreviewCache"), true);
    equal(source.includes("renderMode: \"pressure-lite\""), true);
    equal(source.includes("eraserRenderMode: \"paint\""), true);
    equal(source.includes("pointsPerPressureSegment: 4"), true);
  });

  it("prewarms onion skin opacity so frame selection does not build the previous frame on demand", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");
    const previewSource = readFileSync(resolve("src/components/stroke-preview.tsx"), "utf8");

    equal(previewSource.includes("opacity?: number"), true);
    equal(source.includes("onionOpacityPercent"), true);
    equal(source.includes("onionOpacity"), true);
    equal(source.includes("opacity: onionOpacity"), true);
    equal(source.includes("opacity: 0.24"), false);
  });

  it("keeps pen and eraser brush sizes separate while passing only the active size to the canvas", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("penSize"), true);
    equal(source.includes("setPenSize"), true);
    equal(source.includes("eraserSize"), true);
    equal(source.includes("setEraserSize"), true);
    equal(source.includes("activeBrushSize"), true);
    equal(source.includes("brushSize={activeBrushSize}"), true);
  });

  it("wires frame reorder into every frame list", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("moveFrame"), true);
    equal(source.includes("function handleMoveFrame(frameId: string, toIndex: number)"), true);
    equal(source.includes("onMoveFrame={handleMoveFrame}"), true);
  });

  it("keeps duplicate and delete behind selected-frame confirm actions", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");

    equal(source.includes("Alert.alert"), true);
    equal(source.includes('Alert.alert("프레임 복제"'), true);
    equal(source.includes('Alert.alert("프레임 삭제"'), true);
    equal(source.includes('style: "destructive"'), true);
    equal(source.includes("duplicateFrame"), true);
    equal(source.includes("removeFrame"), true);
    equal(source.includes("function confirmDuplicateFrame()"), true);
    equal(source.includes("function confirmRemoveFrame()"), true);
    equal(source.includes('title="복제"'), true);
    equal(source.includes('title="삭제"'), true);
    equal(source.includes("onDuplicateFrame={handleDuplicateFrame}"), false);
    equal(source.includes("onRemoveFrame={handleRemoveFrame}"), false);
  });
});
