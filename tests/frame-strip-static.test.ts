import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { equal } from "node:assert/strict";
import { describe, it } from "./harness";

describe("frame strip layout contract", () => {
  it("keeps static frame list styles in StyleSheet instead of inline style props", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("StyleSheet.create"), true);
    equal(source.includes("style={{"), false);
    equal(source.includes("contentContainerStyle={{"), false);
  });

  it("keeps the horizontal strip fitted to the available screen width", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("horizontal={horizontal}"), true);
    equal(source.includes('width: horizontal ? "100%" : undefined'), true);
  });

  it("keeps the frame strip border outside the scrollable content", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("styles.stripFrame"), true);
    equal(source.includes("style={styles.stripScroll}"), true);
    equal(source.includes("stripFrame: {"), true);
    equal(source.includes("borderWidth: 1"), true);
  });

  it("keeps the frame grid border visible in landscape grid mode", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("styles.gridFrame"), true);
    equal(source.includes("styles.gridFrameScrollable"), true);
    equal(source.includes("gridFrame: {"), true);
  });

  it("lets frame grid rows wrap against the full available width", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes('width: "100%"'), true);
    equal(source.includes('alignItems: "stretch"'), true);
    equal(source.includes("const gridContentWidth = Math.max(80, Math.max(120, gridViewportWidth || 260) - 20)"), true);
    equal(source.includes("minWidth: gridContentWidth"), true);
    equal(source.includes("minWidth: gridViewportWidth"), false);
  });

  it("can expand horizontal frame strips inside landscape frame panels", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("expanded?: boolean"), true);
    equal(source.includes("expanded = false"), true);
    equal(source.includes("expanded ? 118 : 92"), true);
  });

  it("can let landscape frame strips fill the remaining panel height", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("fillAvailable?: boolean"), true);
    equal(source.includes("viewportWidth?: number"), true);
    equal(source.includes("viewportHeight?: number"), true);
    equal(source.includes("fillAvailable = false"), true);
    equal(source.includes("FrameThumbnail"), true);
    equal(source.includes("stripWidth"), false);
    equal(source.includes("setStripWidth"), false);
    equal(source.includes("stripHeight"), false);
    equal(source.includes("setStripHeight"), false);
    equal(source.includes("contentContainerStyle"), true);
    equal(source.includes("alignItems: fillAvailable ? \"center\" : undefined"), true);
    equal(source.includes("flex: fillAvailable ? 1 : undefined"), true);
    equal(source.includes("maxHeight: fillAvailable ? undefined : horizontal ? (expanded ? 118 : 92) : undefined"), true);
  });

  it("allows frame grids to scroll inside compact landscape panels", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("scrollable?: boolean"), true);
    equal(source.includes("gridHeight?: number"), true);
    equal(source.includes("gridViewportWidth, setGridViewportWidth"), false);
    equal(source.includes("gridWidth ?? 260"), true);
    equal(source.includes("showsVerticalScrollIndicator={false}"), true);
    equal(source.includes("FlashList"), true);
    equal(source.includes('from "@shopify/flash-list"'), true);
  });

  it("shows a persistent overflow hint when scrollable frame grids have more content below", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("hasMoreFramesBelow"), true);
    equal(source.includes('testID="frame-grid-more-hint"'), true);
    equal(source.includes('testID="frame-grid-more-chevron"'), true);
    equal(source.includes("onContentSizeChange"), true);
    equal(source.includes("onLayout"), false);
    equal(source.includes("more frames v"), false);
  });

  it("can hide the add thumbnail when a surrounding panel owns the add action", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("showAdd?: boolean"), true);
    equal(source.includes("showAdd = true"), true);
  });

  it("renders frame creation as a same-size thumbnail with only a plus icon", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("function AddFrameThumbnail"), true);
    equal(source.includes("style={[styles.thumbnail, styles.addThumbnail, { width, height }]}"), true);
    equal(source.includes('accessibilityLabel="프레임 추가"'), true);
    equal(source.includes("styles.addLabel"), false);
    equal(source.includes("addLabel:"), false);
  });

  it("can append the add thumbnail to frame grids when an add handler is provided", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("type FrameGridItem"), true);
    equal(source.includes("const ADD_FRAME_ITEM"), true);
    equal(source.includes("gridData"), true);
    equal(source.includes("<AddFrameThumbnail"), true);
  });

  it("uses long press and drag gestures for frame reorder instead of action modals", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("onMoveFrame?: (frameId: string, toIndex: number) => void"), true);
    equal(source.includes("longPressTimer"), true);
    equal(source.includes("handleTouchStart"), true);
    equal(source.includes("handleTouchMove"), true);
    equal(source.includes("handleTouchEnd"), true);
    equal(source.includes("getFrameReorderTargetIndexFromPoint"), true);
    equal(source.includes("getStripReorderTargetIndex"), true);
    equal(source.includes("getGridReorderTargetIndex"), true);
    equal(source.includes("getFrameReorderPreview"), true);
    equal(source.includes("FrameActionModal"), false);
    equal(source.includes('title="복제"'), false);
    equal(source.includes('title="삭제"'), false);
    equal(source.includes("styles.thumbnailActions"), false);
    equal(source.includes("thumbnailActionButton"), false);
  });

  it("clears parent reorder state when a frame drag touch is cancelled", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("onCancelMove?: (frameId: string) => void"), true);
    equal(source.includes("const cancelMove = useCallback("), true);
    equal(source.includes("const handleTouchCancel = useCallback(() => {\n    clearLongPressTimer();\n    if (movingStarted.current) {\n      onCancelMove?.(frame.id);\n    }\n    resetTouchState();"), true);
  });

  it("keeps frame drag release owned by the thumbnail responder", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("const handleResponderTerminationRequest = useCallback(() => !movingStarted.current, [])"), true);
    equal(source.includes("onStartShouldSetResponder={handleStartShouldSetResponder}"), true);
    equal(source.includes("onMoveShouldSetResponder={handleStartShouldSetResponder}"), true);
    equal(source.includes("onResponderGrant={handleTouchStart}"), true);
    equal(source.includes("onResponderMove={handleTouchMove}"), true);
    equal(source.includes("onResponderRelease={handleTouchEnd}"), true);
    equal(source.includes("onResponderTerminate={handleTouchCancel}"), true);
    equal(source.includes("onResponderTerminationRequest={handleResponderTerminationRequest}"), true);
  });

  it("shows drag affordance and target state while moving a frame", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("moving: boolean"), true);
    equal(source.includes("dropTarget: boolean"), true);
    equal(source.includes("previewFrames"), true);
    equal(source.includes("styles.thumbnailMoving"), true);
    equal(source.includes("styles.thumbnailDropTarget"), true);
    equal(source.includes("styles.dragHandle"), true);
  });

  it("animates neighboring frame slots when reorder preview shifts", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes('from "react-native-reanimated"'), true);
    equal(source.includes("LinearTransition"), true);
    equal(source.includes("FRAME_REORDER_SHIFT_TRANSITION"), true);
    equal(source.includes("layout={FRAME_REORDER_SHIFT_TRANSITION}"), true);
    equal(source.includes("<Animated.View"), true);
  });

  it("keeps the dragged frame out of layout animation so it does not fight the finger transform", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("layout={item.id === movingFrameId ? undefined : FRAME_REORDER_SHIFT_TRANSITION}"), true);
  });

  it("translates the moving frame so it follows the dragging finger", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("FrameDragOverlay"), false);
    equal(source.includes("getDraggedFrameOffset"), true);
    equal(source.includes("dragDelta"), true);
    equal(source.includes("dragOffset"), true);
    equal(source.includes("{ translateX: dragOffset.x }"), true);
    equal(source.includes("{ translateY: dragOffset.y }"), true);
    equal(source.includes("styles.thumbnailDragging"), true);
    equal(source.includes("styles.frameItemDragging"), true);
  });

  it("keeps unchanged frame thumbnails memoized even when parent callbacks are recreated", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("FrameThumbnailBase,"), true);
    equal(source.includes("previous.frame === next.frame"), true);
  });

  it("keeps expensive thumbnail stroke previews independent from selection state changes", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("FrameThumbnailPreviewBase"), true);
    equal(source.includes("const FrameThumbnailPreview = memo("), true);
    equal(source.includes("<FrameThumbnailPreview"), true);
    equal(source.includes("previous.previewSide === next.previewSide"), true);
    equal(source.includes("previous.previewScale === next.previewScale"), true);
    equal(source.includes("active: boolean;\n  width: number"), true);
  });

  it("uses virtualized lists instead of rendering all frames through ScrollView maps", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("ScrollView"), false);
    equal(source.includes("renderItem"), true);
    equal(source.includes("keyExtractor"), true);
  });

  it("labels frame thumbnails for assistive technologies", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("accessibilityRole"), true);
    equal(source.includes("accessibilityLabel"), true);
    equal(source.includes("accessibilityState"), true);
  });

  it("uses the shared composite renderer so generated backgrounds and strokes stay consistent", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");
    const composite = readFileSync(resolve("src/components/frame-composite.tsx"), "utf8");

    equal(source.includes("FrameComposite"), true);
    equal(composite.includes('eraserRenderMode={frame.background ? "mask" : "paint"}'), true);
  });

  it("keeps each thumbnail drawing area square and visually separated from its label", () => {
    const source = readFileSync(resolve("src/components/frame-strip.tsx"), "utf8");

    equal(source.includes("const previewSide = Math.min(width, Math.max(24, height - labelHeight))"), true);
    equal(source.includes("{ width: previewSide, height: previewSide }"), true);
    equal(source.includes("thumbnailCanvas"), true);
    equal(source.includes("borderTopWidth: 1"), true);
    equal(source.includes("backgroundColor: theme.color.paperSoft"), true);
  });
});
