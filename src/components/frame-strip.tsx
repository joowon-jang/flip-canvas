import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import { shadow, theme } from "../theme";
import type { FlipFrame } from "../types/flipbook";
import { getDraggedFrameOffset, getFrameReorderPreview, getFrameReorderTargetIndexFromPoint, getGridReorderTargetIndex, getStripReorderTargetIndex, type FrameReorderSlot } from "./frame-reorder";
import { getFrameGridMetrics, getFrameStripThumbnailMetrics } from "./frame-strip-metrics";
import { StrokePreview } from "./stroke-preview";

type FrameStripProps = {
  frames: FlipFrame[];
  currentFrameId: string;
  onSelect: (frameId: string) => void;
  onAdd: () => void;
  onMoveFrame?: (frameId: string, toIndex: number) => void;
  horizontal?: boolean;
  showAdd?: boolean;
  expanded?: boolean;
  fillAvailable?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
};

const keyExtractor = (frame: FlipFrame) => frame.id;

const ADD_FRAME_ITEM = { id: "__add-frame__", type: "add-frame" } as const;
const LONG_PRESS_DELAY_MS = 260;
const TAP_MOVEMENT_THRESHOLD = 8;
const FRAME_REORDER_SHIFT_TRANSITION = LinearTransition.duration(140);
const EMPTY_DRAG_OFFSET = { x: 0, y: 0 };

type AddFrameThumbnailProps = {
  width: number;
  height: number;
  onAdd: () => void;
};

function AddFrameThumbnail({ width, height, onAdd }: AddFrameThumbnailProps) {
  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel="프레임 추가"
      onPress={onAdd}
      style={[styles.thumbnail, styles.addThumbnail, { width, height }]}
    >
      <Text selectable={false} style={styles.addIcon}>
        +
      </Text>
    </Pressable>
  );
}

function getSlotCenter(slot: FrameReorderSlot) {
  return {
    x: slot.x + slot.width / 2,
    y: slot.y + slot.height / 2,
  };
}

export function FrameStrip({
  frames,
  currentFrameId,
  onSelect,
  onAdd,
  onMoveFrame,
  horizontal = true,
  showAdd = true,
  expanded = false,
  fillAvailable = false,
  viewportWidth = 0,
  viewportHeight = 0,
}: FrameStripProps) {
  const { frameWidth, frameHeight, previewScale, stripGap, stripPadding } = getFrameStripThumbnailMetrics({
    horizontal,
    expanded,
    fillAvailable,
    viewportWidth,
    viewportHeight,
  });
  const [movingFrameId, setMovingFrameId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(EMPTY_DRAG_OFFSET);
  const previewFrames = useMemo(() => getFrameReorderPreview(frames, movingFrameId, dropTargetIndex), [dropTargetIndex, frames, movingFrameId]);
  const stripSlots = useMemo<FrameReorderSlot[]>(
    () =>
      previewFrames.map((frame, index) => ({
        id: frame.id,
        index,
        x: horizontal ? stripPadding + index * (frameWidth + stripGap) : stripPadding,
        y: horizontal ? stripPadding : stripPadding + index * (frameHeight + stripGap),
        width: frameWidth,
        height: frameHeight,
      })),
    [frameHeight, frameWidth, horizontal, previewFrames, stripGap, stripPadding],
  );
  const dragStartCenterRef = useRef<{ x: number; y: number } | null>(null);
  const listExtraData = useMemo(
    () => ({ currentFrameId, movingFrameId, dropTargetIndex, onMoveFrame, dragDelta }),
    [currentFrameId, dragDelta, dropTargetIndex, movingFrameId, onMoveFrame],
  );
  const beginMove = useCallback(
    (frameId: string) => {
      const frame = frames.find((item) => item.id === frameId);
      const slot = stripSlots.find((item) => item.id === frameId);
      dragStartCenterRef.current = slot ? getSlotCenter(slot) : null;
      onSelect(frameId);
      setMovingFrameId(frameId);
      setDropTargetIndex(frame?.index ?? null);
      setDragDelta(EMPTY_DRAG_OFFSET);
    },
    [frames, onSelect, stripSlots],
  );
  const updateMove = useCallback(
    (frameId: string, deltaX: number, deltaY: number) => {
      const frame = frames.find((item) => item.id === frameId);
      if (!frame) {
        return;
      }

      setDragDelta((current) => (current.x === deltaX && current.y === deltaY ? current : { x: deltaX, y: deltaY }));

      if (dragStartCenterRef.current) {
        const pointTargetIndex = getFrameReorderTargetIndexFromPoint({
          slots: stripSlots,
          movingFrameId: frameId,
          pointerX: dragStartCenterRef.current.x + deltaX,
          pointerY: dragStartCenterRef.current.y + deltaY,
        });

        if (pointTargetIndex !== null) {
          setDropTargetIndex(pointTargetIndex);
          return;
        }
      }

      setDropTargetIndex(
        getStripReorderTargetIndex({
          fromIndex: frame.index,
          frameCount: frames.length,
          itemSpan: horizontal ? frameWidth + stripGap : frameHeight + stripGap,
          deltaX,
          deltaY,
          horizontal,
        }),
      );
    },
    [frameHeight, frameWidth, frames, horizontal, stripGap, stripSlots],
  );
  const endMove = useCallback(
    (frameId: string) => {
      const frame = frames.find((item) => item.id === frameId);
      if (frame && dropTargetIndex !== null && dropTargetIndex !== frame.index) {
        onMoveFrame?.(frameId, dropTargetIndex);
      }
      dragStartCenterRef.current = null;
      setDragDelta(EMPTY_DRAG_OFFSET);
      setMovingFrameId(null);
      setDropTargetIndex(null);
    },
    [dropTargetIndex, frames, onMoveFrame],
  );
  const cancelMove = useCallback((_frameId: string) => {
    dragStartCenterRef.current = null;
    setDragDelta(EMPTY_DRAG_OFFSET);
    setMovingFrameId(null);
    setDropTargetIndex(null);
  }, []);
  const getStripDragOffset = useCallback(
    (frameId: string) => {
      if (frameId !== movingFrameId || !dragStartCenterRef.current) {
        return EMPTY_DRAG_OFFSET;
      }

      const currentSlot = stripSlots.find((slot) => slot.id === frameId);
      if (!currentSlot) {
        return EMPTY_DRAG_OFFSET;
      }

      return getDraggedFrameOffset({
        dragStartCenter: dragStartCenterRef.current,
        currentSlot,
        deltaX: dragDelta.x,
        deltaY: dragDelta.y,
      });
    },
    [dragDelta.x, dragDelta.y, movingFrameId, stripSlots],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FlipFrame>) => (
      <Animated.View
        layout={item.id === movingFrameId ? undefined : FRAME_REORDER_SHIFT_TRANSITION}
        style={[
          horizontal ? styles.horizontalItem : styles.verticalItem,
          item.id === movingFrameId ? styles.frameItemDragging : null,
          { marginRight: horizontal ? stripGap : 0, marginBottom: horizontal ? 0 : stripGap },
        ]}
      >
        <FrameThumbnail
          frame={item}
          active={item.id === currentFrameId}
          width={frameWidth}
          height={frameHeight}
          previewScale={previewScale}
          labelFontSize={expanded ? 10 : 9}
          onSelect={onSelect}
          moving={item.id === movingFrameId}
          dropTarget={item.id === movingFrameId && dropTargetIndex !== null}
          dragOffset={getStripDragOffset(item.id)}
          onBeginMove={onMoveFrame ? beginMove : undefined}
          onMove={onMoveFrame ? updateMove : undefined}
          onEndMove={onMoveFrame ? endMove : undefined}
          onCancelMove={onMoveFrame ? cancelMove : undefined}
        />
      </Animated.View>
    ),
    [beginMove, cancelMove, currentFrameId, dropTargetIndex, endMove, expanded, frameHeight, frameWidth, getStripDragOffset, horizontal, movingFrameId, onMoveFrame, onSelect, previewScale, stripGap, updateMove],
  );

  const listFooter = useMemo(() => {
    if (!showAdd) {
      return null;
    }

    return (
      <AddFrameThumbnail width={frameWidth} height={frameHeight} onAdd={onAdd} />
    );
  }, [frameHeight, frameWidth, onAdd, showAdd]);

  return (
    <View
      style={[
        styles.stripFrame,
        {
          width: horizontal ? "100%" : undefined,
          flex: fillAvailable ? 1 : undefined,
          height: fillAvailable ? undefined : horizontal ? (expanded ? 118 : 92) : undefined,
          maxHeight: fillAvailable ? undefined : horizontal ? (expanded ? 118 : 92) : undefined,
        },
      ]}
    >
      <FlashList
        data={previewFrames}
        horizontal={horizontal}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        extraData={listExtraData}
        scrollEnabled={movingFrameId === null}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.stripContent,
          {
            padding: stripPadding,
            flexGrow: fillAvailable ? 1 : undefined,
            alignItems: fillAvailable ? "center" : undefined,
          },
        ]}
        ListFooterComponent={listFooter}
        ListFooterComponentStyle={[horizontal ? styles.horizontalFooter : styles.verticalFooter, { marginLeft: horizontal ? stripGap : 0, marginTop: horizontal ? 0 : stripGap }]}
        style={styles.stripScroll}
      />
    </View>
  );
}

type FrameThumbnailProps = {
  frame: FlipFrame;
  active: boolean;
  width: number;
  height: number;
  previewScale: number;
  labelFontSize: number;
  onSelect: (frameId: string) => void;
  moving: boolean;
  dropTarget: boolean;
  dragOffset: { x: number; y: number };
  onBeginMove?: (frameId: string) => void;
  onMove?: (frameId: string, deltaX: number, deltaY: number) => void;
  onEndMove?: (frameId: string) => void;
  onCancelMove?: (frameId: string) => void;
};

type FrameThumbnailPreviewProps = {
  frame: FlipFrame;
  previewSide: number;
  previewScale: number;
};

function FrameThumbnailPreviewBase({ frame, previewSide, previewScale }: FrameThumbnailPreviewProps) {
  return (
    <View style={[styles.thumbnailCanvas, { width: previewSide, height: previewSide }]}>
      <StrokePreview strokes={frame.strokes} scale={previewScale} renderMode="pressure-lite" pointsPerPressureSegment={4} eraserRenderMode="paint" />
    </View>
  );
}

const FrameThumbnailPreview = memo(
  FrameThumbnailPreviewBase,
  (previous, next) =>
    previous.frame === next.frame &&
    previous.previewSide === next.previewSide &&
    previous.previewScale === next.previewScale,
);

function FrameThumbnailBase({
  frame,
  active,
  width,
  height,
  previewScale,
  labelFontSize,
  onSelect,
  moving,
  dropTarget,
  dragOffset,
  onBeginMove,
  onMove,
  onEndMove,
  onCancelMove,
}: FrameThumbnailProps) {
  const labelHeight = Math.max(18, labelFontSize + 8);
  const previewSide = Math.min(width, Math.max(24, height - labelHeight));
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movingStarted = useRef(false);
  const touchStartPoint = useRef<{ x: number; y: number } | null>(null);
  const lastTouchDelta = useRef({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const canMove = Boolean(onBeginMove && onMove && onEndMove);
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);
  const beginTouchMove = useCallback(() => {
    if (!canMove || movingStarted.current) {
      return;
    }

    movingStarted.current = true;
    setIsMoving(true);
    onBeginMove?.(frame.id);
    onMove?.(frame.id, lastTouchDelta.current.x, lastTouchDelta.current.y);
  }, [canMove, frame.id, onBeginMove, onMove]);
  const getTouchDelta = useCallback((event: GestureResponderEvent) => {
    if (!touchStartPoint.current) {
      return { x: 0, y: 0 };
    }

    return {
      x: event.nativeEvent.pageX - touchStartPoint.current.x,
      y: event.nativeEvent.pageY - touchStartPoint.current.y,
    };
  }, []);
  const resetTouchState = useCallback(() => {
    touchStartPoint.current = null;
    lastTouchDelta.current = { x: 0, y: 0 };
    movingStarted.current = false;
    setIsMoving(false);
  }, []);
  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    clearLongPressTimer();
    movingStarted.current = false;
    setIsMoving(false);
    touchStartPoint.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    };
    lastTouchDelta.current = { x: 0, y: 0 };
    if (canMove) {
      longPressTimer.current = setTimeout(beginTouchMove, LONG_PRESS_DELAY_MS);
    }
  }, [beginTouchMove, canMove, clearLongPressTimer]);
  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      const delta = getTouchDelta(event);
      lastTouchDelta.current = delta;

      if (!movingStarted.current) {
        return;
      }

      onMove?.(frame.id, delta.x, delta.y);
    },
    [frame.id, getTouchDelta, onMove],
  );
  const handleTouchEnd = useCallback(
    (event: GestureResponderEvent) => {
      clearLongPressTimer();
      if (movingStarted.current) {
        resetTouchState();
        onEndMove?.(frame.id);
        return;
      }

      const delta = getTouchDelta(event);
      resetTouchState();
      if (Math.abs(delta.x) <= TAP_MOVEMENT_THRESHOLD && Math.abs(delta.y) <= TAP_MOVEMENT_THRESHOLD) {
        onSelect(frame.id);
      }
    },
    [clearLongPressTimer, frame.id, getTouchDelta, onEndMove, onSelect, resetTouchState],
  );
  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer();
    if (movingStarted.current) {
      onCancelMove?.(frame.id);
    }
    resetTouchState();
  }, [clearLongPressTimer, frame.id, onCancelMove, resetTouchState]);
  const handleStartShouldSetResponder = useCallback(() => true, []);
  const handleResponderTerminationRequest = useCallback(() => !movingStarted.current, []);
  const handleAccessibilityTap = useCallback(() => {
    if (!movingStarted.current) {
      onSelect(frame.id);
    }
  }, [frame.id, onSelect]);
  const movingStyleActive = moving || isMoving;
  const draggingStyleActive = movingStyleActive && (dragOffset.x !== 0 || dragOffset.y !== 0);

  return (
    <View
      style={[
        styles.thumbnail,
        active ? styles.thumbnailActive : styles.thumbnailInactive,
        dropTarget ? styles.thumbnailDropTarget : null,
        movingStyleActive ? styles.thumbnailMoving : null,
        draggingStyleActive ? [styles.thumbnailDragging, { transform: [{ translateX: dragOffset.x }, { translateY: dragOffset.y }] }] : null,
        { width, height },
      ]}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`프레임 ${frame.index + 1}${active ? " 선택됨" : " 선택"}`}
        accessibilityState={{ selected: active }}
        accessibilityHint={canMove ? "길게 누른 채 끌면 프레임 순서를 바꿉니다." : undefined}
        onAccessibilityTap={handleAccessibilityTap}
        onStartShouldSetResponder={handleStartShouldSetResponder}
        onMoveShouldSetResponder={handleStartShouldSetResponder}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={handleTouchCancel}
        onResponderTerminationRequest={handleResponderTerminationRequest}
        style={styles.thumbnailSelectArea}
      >
        {canMove ? <View style={[styles.dragHandle, { pointerEvents: "none" }]} /> : null}
        <FrameThumbnailPreview frame={frame} previewSide={previewSide} previewScale={previewScale} />
        <Text
          selectable={false}
          style={[
            styles.thumbnailLabel,
            active ? styles.thumbnailLabelActive : styles.thumbnailLabelInactive,
            { height: labelHeight, lineHeight: labelHeight, fontSize: labelFontSize },
          ]}
        >
          {String(frame.index + 1).padStart(3, "0")}
        </Text>
      </View>
    </View>
  );
}

const FrameThumbnail = memo(
  FrameThumbnailBase,
  (previous, next) =>
    previous.frame === next.frame &&
    previous.active === next.active &&
    previous.width === next.width &&
    previous.height === next.height &&
    previous.previewScale === next.previewScale &&
    previous.labelFontSize === next.labelFontSize &&
    previous.moving === next.moving &&
    previous.dropTarget === next.dropTarget &&
    previous.dragOffset.x === next.dragOffset.x &&
    previous.dragOffset.y === next.dragOffset.y &&
    previous.onBeginMove === next.onBeginMove &&
    previous.onMove === next.onMove &&
    previous.onEndMove === next.onEndMove &&
    previous.onCancelMove === next.onCancelMove,
);

type FrameGridProps = Omit<FrameStripProps, "onAdd" | "horizontal"> & {
  onAdd?: () => void;
  gridWidth?: number;
  gridHeight?: number;
  scrollable?: boolean;
};

type FrameGridItem = FlipFrame | typeof ADD_FRAME_ITEM;

const gridKeyExtractor = (item: FrameGridItem) => item.id;

function isAddFrameItem(item: FrameGridItem): item is typeof ADD_FRAME_ITEM {
  return "type" in item && item.type === ADD_FRAME_ITEM.type;
}

export function FrameGrid({
  frames,
  currentFrameId,
  onSelect,
  onAdd,
  onMoveFrame,
  showAdd = true,
  gridWidth,
  gridHeight,
  scrollable = false,
}: FrameGridProps) {
  const gridViewportWidth = gridWidth ?? 260;
  const gridContentWidth = Math.max(80, Math.max(120, gridViewportWidth || 260) - 20);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const gridMetrics = getFrameGridMetrics({ viewportWidth: gridViewportWidth });
  const shouldShowAdd = showAdd && Boolean(onAdd);
  const [movingFrameId, setMovingFrameId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(EMPTY_DRAG_OFFSET);
  const previewFrames = useMemo(() => getFrameReorderPreview(frames, movingFrameId, dropTargetIndex), [dropTargetIndex, frames, movingFrameId]);
  const gridData = useMemo<FrameGridItem[]>(() => (shouldShowAdd ? [...previewFrames, ADD_FRAME_ITEM] : previewFrames), [previewFrames, shouldShowAdd]);
  const gridColumns = useMemo(() => {
    return Math.max(1, Math.floor((gridContentWidth + gridMetrics.gridGap) / (gridMetrics.frameWidth + gridMetrics.gridGap)));
  }, [gridContentWidth, gridMetrics.frameWidth, gridMetrics.gridGap]);
  const gridSlots = useMemo<FrameReorderSlot[]>(() => {
    const cellWidth = gridContentWidth / gridColumns;

    return previewFrames.map((frame, index) => {
      const column = index % gridColumns;
      const row = Math.floor(index / gridColumns);

      return {
        id: frame.id,
        index,
        x: 10 + column * cellWidth + Math.max(0, (cellWidth - gridMetrics.frameWidth) / 2),
        y: 10 + row * (gridMetrics.frameHeight + gridMetrics.gridGap),
        width: gridMetrics.frameWidth,
        height: gridMetrics.frameHeight,
      };
    });
  }, [gridColumns, gridContentWidth, gridMetrics.frameHeight, gridMetrics.frameWidth, gridMetrics.gridGap, previewFrames]);
  const dragStartCenterRef = useRef<{ x: number; y: number } | null>(null);
  const listExtraData = useMemo(
    () => ({ currentFrameId, movingFrameId, dropTargetIndex, onMoveFrame, dragDelta }),
    [currentFrameId, dragDelta, dropTargetIndex, movingFrameId, onMoveFrame],
  );
  const gridRows = Math.max(1, Math.ceil(gridData.length / gridColumns));
  const calculatedGridHeight = gridRows * gridMetrics.frameHeight + Math.max(0, gridRows - 1) * gridMetrics.gridGap + 20;
  const viewportHeight = gridHeight ?? calculatedGridHeight;
  const hasMoreFramesBelow = scrollable && contentHeight > viewportHeight + 4 && scrollY + viewportHeight < contentHeight - 8;

  const handleContentSizeChange = useCallback((_: number, nextContentHeight: number) => {
    setContentHeight((current) => (current === nextContentHeight ? current : nextContentHeight));
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextY = event.nativeEvent.contentOffset.y;
    setScrollY((current) => (Math.abs(current - nextY) < 1 ? current : nextY));
  }, []);
  const beginMove = useCallback(
    (frameId: string) => {
      const frame = frames.find((item) => item.id === frameId);
      const slot = gridSlots.find((item) => item.id === frameId);
      dragStartCenterRef.current = slot ? getSlotCenter(slot) : null;
      onSelect(frameId);
      setMovingFrameId(frameId);
      setDropTargetIndex(frame?.index ?? null);
      setDragDelta(EMPTY_DRAG_OFFSET);
    },
    [frames, gridSlots, onSelect],
  );
  const updateMove = useCallback(
    (frameId: string, deltaX: number, deltaY: number) => {
      const frame = frames.find((item) => item.id === frameId);
      if (!frame) {
        return;
      }

      setDragDelta((current) => (current.x === deltaX && current.y === deltaY ? current : { x: deltaX, y: deltaY }));

      if (dragStartCenterRef.current) {
        const pointTargetIndex = getFrameReorderTargetIndexFromPoint({
          slots: gridSlots,
          movingFrameId: frameId,
          pointerX: dragStartCenterRef.current.x + deltaX,
          pointerY: dragStartCenterRef.current.y + deltaY,
        });

        if (pointTargetIndex !== null) {
          setDropTargetIndex(pointTargetIndex);
          return;
        }
      }

      setDropTargetIndex(
        getGridReorderTargetIndex({
          fromIndex: frame.index,
          frameCount: frames.length,
          columns: gridColumns,
          itemWidth: gridMetrics.frameWidth + gridMetrics.gridGap,
          itemHeight: gridMetrics.frameHeight + gridMetrics.gridGap,
          deltaX,
          deltaY,
        }),
      );
    },
    [frames, gridColumns, gridMetrics.frameHeight, gridMetrics.frameWidth, gridMetrics.gridGap, gridSlots],
  );
  const endMove = useCallback(
    (frameId: string) => {
      const frame = frames.find((item) => item.id === frameId);
      if (frame && dropTargetIndex !== null && dropTargetIndex !== frame.index) {
        onMoveFrame?.(frameId, dropTargetIndex);
      }
      dragStartCenterRef.current = null;
      setDragDelta(EMPTY_DRAG_OFFSET);
      setMovingFrameId(null);
      setDropTargetIndex(null);
    },
    [dropTargetIndex, frames, onMoveFrame],
  );
  const cancelMove = useCallback((_frameId: string) => {
    dragStartCenterRef.current = null;
    setDragDelta(EMPTY_DRAG_OFFSET);
    setMovingFrameId(null);
    setDropTargetIndex(null);
  }, []);
  const getGridDragOffset = useCallback(
    (frameId: string) => {
      if (frameId !== movingFrameId || !dragStartCenterRef.current) {
        return EMPTY_DRAG_OFFSET;
      }

      const currentSlot = gridSlots.find((slot) => slot.id === frameId);
      if (!currentSlot) {
        return EMPTY_DRAG_OFFSET;
      }

      return getDraggedFrameOffset({
        dragStartCenter: dragStartCenterRef.current,
        currentSlot,
        deltaX: dragDelta.x,
        deltaY: dragDelta.y,
      });
    },
    [dragDelta.x, dragDelta.y, gridSlots, movingFrameId],
  );

  const renderGridItem = useCallback(
    ({ item }: ListRenderItemInfo<FrameGridItem>) => {
      if (isAddFrameItem(item)) {
        return (
          <Animated.View layout={FRAME_REORDER_SHIFT_TRANSITION} style={[styles.gridItem, { marginBottom: gridMetrics.gridGap }]}>
            {onAdd ? <AddFrameThumbnail width={gridMetrics.frameWidth} height={gridMetrics.frameHeight} onAdd={onAdd} /> : null}
          </Animated.View>
        );
      }

      return (
        <Animated.View
          layout={item.id === movingFrameId ? undefined : FRAME_REORDER_SHIFT_TRANSITION}
          style={[
            styles.gridItem,
            item.id === movingFrameId ? styles.frameItemDragging : null,
            { marginBottom: gridMetrics.gridGap },
          ]}
        >
          <FrameThumbnail
            frame={item}
            active={item.id === currentFrameId}
            width={gridMetrics.frameWidth}
            height={gridMetrics.frameHeight}
            previewScale={gridMetrics.previewScale}
            labelFontSize={9}
            onSelect={onSelect}
            moving={item.id === movingFrameId}
            dropTarget={item.id === movingFrameId && dropTargetIndex !== null}
            dragOffset={getGridDragOffset(item.id)}
            onBeginMove={onMoveFrame ? beginMove : undefined}
            onMove={onMoveFrame ? updateMove : undefined}
            onEndMove={onMoveFrame ? endMove : undefined}
            onCancelMove={onMoveFrame ? cancelMove : undefined}
          />
        </Animated.View>
      );
    },
    [beginMove, cancelMove, currentFrameId, dropTargetIndex, endMove, getGridDragOffset, gridMetrics.frameHeight, gridMetrics.frameWidth, gridMetrics.gridGap, gridMetrics.previewScale, movingFrameId, onAdd, onMoveFrame, onSelect, updateMove],
  );

  return (
    <View
      style={[
        styles.gridFrame,
        scrollable && !gridHeight ? styles.gridFrameScrollable : null,
        gridWidth ? { width: gridWidth, alignSelf: "center" } : styles.gridFrameFluid,
        scrollable && gridHeight ? { height: gridHeight } : null,
        scrollable ? null : { height: calculatedGridHeight },
      ]}
    >
      <View style={styles.scrollableGrid}>
        <FlashList
          data={gridData}
          keyExtractor={gridKeyExtractor}
          renderItem={renderGridItem}
          numColumns={gridColumns}
          extraData={listExtraData}
          scrollEnabled={scrollable && movingFrameId === null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.gridScrollContent,
            { minWidth: gridContentWidth, alignItems: "stretch" },
          ]}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.gridScroll}
        />
        {hasMoreFramesBelow ? (
          <View
            testID="frame-grid-more-hint"

            style={styles.moreHint}
          >
            <View
              testID="frame-grid-more-chevron"
              style={styles.moreChevron}
            >
              <View
                style={styles.moreChevronLeft}
              />
              <View
                style={styles.moreChevronRight}
              />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stripFrame: {
    overflow: "hidden",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  stripScroll: {
    flex: 1,
  },
  stripContent: {},
  horizontalItem: {},
  verticalItem: {},
  horizontalFooter: {},
  verticalFooter: {},
  frameItemDragging: {
    zIndex: 5,
    elevation: 5,
  },
  thumbnail: {
    borderRadius: theme.radius.xs,
    overflow: "hidden",
    position: "relative",
  },
  thumbnailSelectArea: {
    flex: 1,
  },
  thumbnailActive: {
    borderWidth: 1.6,
    borderColor: theme.color.deepBlue,
    backgroundColor: theme.color.paper,
  },
  thumbnailMoving: {
    opacity: 0.74,
  },
  thumbnailDragging: {
    zIndex: 5,
    elevation: 5,
  },
  thumbnailDropTarget: {
    borderWidth: 2,
    borderColor: theme.color.vermilion,
  },
  dragHandle: {
    position: "absolute",
    top: 5,
    right: 5,
    zIndex: 2,
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.color.muted,
    opacity: 0.66,
  },
  thumbnailInactive: {
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paperSoft,
  },
  thumbnailCanvas: {
    alignSelf: "center",
    backgroundColor: theme.color.paper,
  },
  thumbnailLabel: {
    textAlign: "center",
    fontWeight: "700",
    borderTopWidth: 1,
    borderTopColor: theme.color.hairline,
    backgroundColor: theme.color.paperSoft,
  },
  thumbnailLabelActive: {
    color: theme.color.deepBlue,
  },
  thumbnailLabelInactive: {
    color: theme.color.muted,
  },
  addThumbnail: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paperSoft,
  },
  addIcon: {
    color: theme.color.deepBlue,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700",
  },
  gridFrame: {
    padding: 10,
    overflow: "hidden",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
  },
  gridFrameFluid: {
    width: "100%",
  },
  gridFrameScrollable: {
    flex: 1,
    padding: 0,
  },
  scrollableGrid: {
    flex: 1,
    position: "relative",
    width: "100%",
  },
  gridScroll: {
    flex: 1,
    width: "100%",
  },
  gridItem: {
    alignItems: "center",
  },
  gridScrollContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 34,
    alignItems: "stretch",
  },
  moreHint: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 34,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 7,
    backgroundColor: theme.color.overlay,
  },
  moreChevron: {
    width: 18,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.82,
  },
  moreChevronLeft: {
    position: "absolute",
    left: 2,
    width: 9,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.color.deepBlue,
    transform: [{ rotate: "35deg" }],
  },
  moreChevronRight: {
    position: "absolute",
    right: 2,
    width: 9,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.color.deepBlue,
    transform: [{ rotate: "-35deg" }],
  },
});
