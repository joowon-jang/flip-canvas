import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View, type LayoutChangeEvent, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSurface } from "../../../src/components/app-surface";
import { Button } from "../../../src/components/button";
import { FrameGrid, FrameStrip } from "../../../src/components/frame-strip";
import { ScreenHeader } from "../../../src/components/screen-header";
import { prewarmStrokePreviewCache } from "../../../src/components/stroke-preview";
import { ToolDock, type DrawingTool } from "../../../src/components/tool-dock";
import { CANONICAL_CANVAS_SIZE } from "../../../src/drawing/canvas-constants";
import { hexToRgba, rgbaToHex8 } from "../../../src/drawing/color";
import { DrawingCanvas } from "../../../src/drawing/drawing-canvas";
import { getDrawStudioLayout } from "../../../src/drawing/draw-layout";
import { useDrawSession } from "../../../src/drawing/use-draw-session";
import { addFrameToEnd, duplicateFrame, moveFrame, removeFrame } from "../../../src/model/frame-actions";
import { goBackOrReplace } from "../../../src/navigation/go-back";
import { useProject, useProjectActions, useProjectSaveStatus } from "../../../src/state/project-store";
import { theme } from "../../../src/theme";
import type { Stroke } from "../../../src/types/flipbook";
import { createId, now } from "../../../src/utils/id";

const DEFAULT_PEN_COLOR = rgbaToHex8(hexToRgba(theme.color.graphite));
const DEFAULT_ONION_OPACITY_PERCENT = 24;

export default function DrawScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { ready, project } = useProject(id);
  const { addStroke, updateFrame, updateProject } = useProjectActions();
  const saveStatus = useProjectSaveStatus(id);
  const [initialRouteLoadingProjectId, setInitialRouteLoadingProjectId] = useState<string | undefined>(id);
  const [frameId, setFrameId] = useState("");
  const [tool, setTool] = useState<DrawingTool>("pen");
  const [penColor, setPenColor] = useState<string>(DEFAULT_PEN_COLOR);
  const [penSize, setPenSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(12);
  const [onionEnabled, setOnionEnabled] = useState(true);
  const [onionOpacityPercent, setOnionOpacityPercent] = useState(DEFAULT_ONION_OPACITY_PERCENT);
  const [landscapeStudioFrame, setLandscapeStudioFrame] = useState<{ windowWidth: number; windowHeight: number; height: number } | null>(null);
  const landscapeStudioHeight =
    landscapeStudioFrame?.windowWidth === width && landscapeStudioFrame.windowHeight === height ? landscapeStudioFrame.height : undefined;
  const layout = getDrawStudioLayout({
    width,
    height,
    surfaceTopPadding: Math.max(insets.top, 18),
    landscapeStudioHeight: landscapeStudioHeight,
  });
  const canvasScale = layout.canvasSize / CANONICAL_CANVAS_SIZE;
  const onionOpacity = onionOpacityPercent / 100;
  const activeBrushSize = tool === "eraser" ? eraserSize : penSize;
  const handleLandscapeStudioLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      setLandscapeStudioFrame((current) => {
        if (current && current.windowWidth === width && current.windowHeight === height && Math.abs(current.height - nextHeight) < 1) {
          return current;
        }

        return { windowWidth: width, windowHeight: height, height: nextHeight };
      });
    },
    [height, width],
  );

  const frame = useMemo(() => project?.frames.find((item) => item.id === frameId) ?? project?.frames[0], [frameId, project]);
  const onionFrame = useMemo(() => {
    if (!project || !frame) {
      return undefined;
    }
    return project.frames[frame.index - 1];
  }, [frame, project]);
  const drawSession = useDrawSession({
    projectId: id,
    addStroke,
    updateFrame,
  });

  useEffect(() => {
    setInitialRouteLoadingProjectId(id);
  }, [id]);

  useEffect(() => {
    if (!project || initialRouteLoadingProjectId !== id) {
      return;
    }

    const idleCallback = requestIdleCallback(() => {
      project.frames.forEach((item) => {
        prewarmStrokePreviewCache(item.strokes, {
          scale: canvasScale,
          renderMode: "pressure-lite",
          pointsPerPressureSegment: 4,
          eraserRenderMode: "paint",
        });
        prewarmStrokePreviewCache(item.strokes, {
          scale: canvasScale,
          opacity: onionOpacity,
          renderMode: "pressure-lite",
          pointsPerPressureSegment: 4,
          eraserRenderMode: "paint",
        });
      });
      setInitialRouteLoadingProjectId((current) => (current === id ? undefined : current));
    }, { timeout: 500 });

    return () => {
      cancelIdleCallback(idleCallback);
    };
  }, [canvasScale, id, initialRouteLoadingProjectId, onionOpacity, project]);

  useEffect(() => {
    if (project && !project.frames.some((item) => item.id === frameId)) {
      setFrameId(project.frames[0]?.id ?? "");
    }
  }, [frameId, project]);

  if (!ready || initialRouteLoadingProjectId === id) {
    return (
      <AppSurface noScroll style={styles.missingProjectSurface}>
        <ActivityIndicator color={theme.color.deepBlue} />
      </AppSurface>
    );
  }

  if (!project || !frame) {
    return (
      <AppSurface noScroll style={styles.missingProjectSurface}>
        <Text selectable style={styles.missingProjectText}>
          프로젝트를 찾을 수 없습니다.
        </Text>
        <Button title="라이브러리" onPress={() => router.replace("/")} style={styles.missingProjectButton} />
      </AppSurface>
    );
  }

  const activeProject = project;
  const activeFrame = frame;

  function commitProject(nextFrames = activeProject.frames) {
    updateProject({ ...activeProject, frames: nextFrames });
  }

  function handleCommitStroke(stroke: Stroke) {
    drawSession.handleCommitStroke(activeProject, activeFrame, stroke);
  }

  function handleUndo() {
    drawSession.handleUndo(activeProject, activeFrame);
  }

  function handleRedo() {
    drawSession.handleRedo(activeProject, activeFrame);
  }

  function handleAddFrame() {
    const addedFrameId = createId("frame");
    const nextFrames = addFrameToEnd(activeProject.frames, () => addedFrameId, now);
    commitProject(nextFrames);
    setFrameId(addedFrameId);
  }

  function handleMoveFrame(frameId: string, toIndex: number) {
    const sourceIndex = activeProject.frames.findIndex((item) => item.id === frameId);
    if (sourceIndex === -1) {
      return;
    }

    commitProject(moveFrame(activeProject.frames, sourceIndex, toIndex));
    setFrameId(frameId);
  }

  function handleDuplicateFrame(frameId: string) {
    if (!activeProject.frames.some((item) => item.id === frameId)) {
      return;
    }

    const duplicatedFrameId = createId("frame");
    const nextFrames = duplicateFrame(activeProject.frames, frameId, () => duplicatedFrameId, now);
    commitProject(nextFrames);
    setFrameId(duplicatedFrameId);
  }

  function handleRemoveFrame(frameId: string) {
    const removedFrame = activeProject.frames.find((item) => item.id === frameId);
    if (!removedFrame || activeProject.frames.length <= 1) {
      return;
    }

    const nextFrames = removeFrame(activeProject.frames, frameId);
    const currentFrame = nextFrames.find((item) => item.id === activeFrame.id);
    const nextFrame = frameId === activeFrame.id ? nextFrames[Math.min(removedFrame.index, nextFrames.length - 1)] : currentFrame ?? nextFrames[0];
    commitProject(nextFrames);
    setFrameId(nextFrame?.id ?? "");
  }

  function confirmDuplicateFrame() {
    Alert.alert("프레임 복제", "선택한 프레임을 복제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "복제", onPress: () => handleDuplicateFrame(activeFrame.id) },
    ]);
  }

  function confirmRemoveFrame() {
    if (activeProject.frames.length <= 1) {
      return;
    }

    Alert.alert("프레임 삭제", "선택한 프레임을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => handleRemoveFrame(activeFrame.id) },
    ]);
  }

  function renderFrameEditActions(actionHeight?: number) {
    const actionStyle = actionHeight ? [styles.frameEditActionButton, { height: actionHeight, minHeight: actionHeight }] : styles.frameEditActionButton;

    return (
      <View style={styles.frameEditActions}>
        <Button compact title="복제" onPress={confirmDuplicateFrame} style={actionStyle} />
        <Button compact title="삭제" variant="dark" disabled={activeProject.frames.length <= 1} onPress={confirmRemoveFrame} style={actionStyle} />
      </View>
    );
  }

  function renderSaveStatusBanner() {
    if (saveStatus.status !== "error") {
      return null;
    }

    return (
      <View style={styles.saveStatusBanner}>
        <Text selectable style={styles.saveStatusText}>
          저장에 실패했습니다.
        </Text>
        <Button compact title="다시 시도" onPress={saveStatus.retry} />
      </View>
    );
  }

  const canvasSize = layout.canvasSize;

  if (layout.orientation === "landscape") {
    const actionButtonStyle = [
      styles.landscapeActionButton,
      { height: layout.actionButtonHeight, minHeight: layout.actionButtonHeight },
      layout.actionDirection === "row" ? styles.landscapeRowActionButton : styles.landscapeColumnActionButton,
    ];

    return (
      <AppSurface
        noScroll
        style={[styles.surface, { paddingHorizontal: layout.surfacePaddingHorizontal, paddingBottom: layout.surfacePaddingBottom }]}
      >
        {renderSaveStatusBanner()}
        <ScreenHeader
          title={project.title}
          subtitle={`landscape studio · ${String(frame.index + 1).padStart(3, "0")} / ${String(project.frames.length).padStart(3, "0")}`}
          onBack={() => goBackOrReplace("/")}
          backLabel="라이브러리"
          compact
          style={[styles.header, { height: layout.headerHeight }]}
        />
        <View onLayout={handleLandscapeStudioLayout} style={[styles.landscapeStudio, { gap: layout.gap }]}>
          <ToolDock
            vertical
            railWidth={layout.toolRailWidth}
            tool={tool}
            onToolChange={setTool}
            penColor={penColor}
            onPenColorChange={setPenColor}
            penSize={penSize}
            onPenSizeChange={setPenSize}
            eraserSize={eraserSize}
            onEraserSizeChange={setEraserSize}
            onionEnabled={onionEnabled}
            onToggleOnion={() => setOnionEnabled((value) => !value)}
            onionOpacityPercent={onionOpacityPercent}
            onOnionOpacityPercentChange={setOnionOpacityPercent}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
          <DrawingCanvas
            frame={frame}
            onionFrame={onionFrame}
            size={canvasSize}
            tool={tool}
            color={penColor}
            brushSize={activeBrushSize}
            onionEnabled={onionEnabled}
            onionOpacity={onionOpacity}
            onCommitStroke={handleCommitStroke}
          />
          <View
            style={[
              styles.framePanel,
              {
                width: layout.sidePanelWidth,
                paddingHorizontal: layout.panelPadding,
                paddingTop: layout.panelPadding,
                paddingBottom: layout.panelPaddingBottom,
                gap: layout.panelGap,
              },
            ]}
          >
            <View style={styles.framePanelHeader}>
              <View style={styles.framePanelTitleGroup}>
                <Text selectable={false} style={[styles.framePanelTitle, { fontSize: layout.titleFontSize }]}>
                  Frames
                </Text>
              </View>
              <Text selectable style={[styles.sheetCount, { fontSize: layout.sheetCountFontSize }]}>
                {project.frames.length} sheets
              </Text>
            </View>
            {layout.frameListMode === "strip" ? (
              <FrameStrip
                frames={project.frames}
                currentFrameId={frame.id}
                onSelect={setFrameId}
                onAdd={handleAddFrame}
                onMoveFrame={handleMoveFrame}
                expanded={layout.frameStripExpanded}
                fillAvailable={layout.frameStripFillAvailable}
                viewportWidth={layout.panelContentWidth}
                viewportHeight={layout.frameListHeight}
              />
            ) : (
              <FrameGrid
                frames={project.frames}
                currentFrameId={frame.id}
                onSelect={setFrameId}
                onAdd={handleAddFrame}
                onMoveFrame={handleMoveFrame}
                gridWidth={layout.panelContentWidth}
                gridHeight={layout.frameListHeight}
                scrollable
              />
            )}
            {renderFrameEditActions(layout.frameEditActionHeight)}
            <View
              testID="landscape-panel-actions"
              style={[styles.landscapeActions, { flexDirection: layout.actionDirection, gap: layout.actionGap }]}
            >
              <Button compact title="미리보기" onPress={() => router.push(`/project/${project.id}/preview`)} style={actionButtonStyle} />
              <Button compact title="영상 만들기" variant="primary" onPress={() => router.push(`/project/${project.id}/render`)} style={actionButtonStyle} />
            </View>
          </View>
        </View>
      </AppSurface>
    );
  }

  return (
    <AppSurface noScroll style={[styles.surface, { paddingHorizontal: layout.surfacePaddingHorizontal, paddingBottom: layout.surfacePaddingBottom }]}>
      {renderSaveStatusBanner()}
      <ScreenHeader
        title={project.title}
        subtitle={`${String(frame.index + 1).padStart(3, "0")} / ${String(project.frames.length).padStart(3, "0")}`}
        onBack={() => goBackOrReplace("/")}
        backLabel="라이브러리"
        compact
        style={[styles.header, { height: layout.headerHeight }]}
      />
      <View testID="canvas-stage" style={styles.canvasStage}>
        <DrawingCanvas
          frame={frame}
          onionFrame={onionFrame}
          size={canvasSize}
          tool={tool}
          color={penColor}
          brushSize={activeBrushSize}
          onionEnabled={onionEnabled}
          onionOpacity={onionOpacity}
          onCommitStroke={handleCommitStroke}
        />
      </View>
      <View style={styles.portraitSpacer} />
      <FrameStrip
        frames={project.frames}
        currentFrameId={frame.id}
        onSelect={setFrameId}
        onAdd={handleAddFrame}
        onMoveFrame={handleMoveFrame}
        viewportWidth={width - layout.surfacePaddingHorizontal * 2}
        viewportHeight={92}
      />
      {renderFrameEditActions()}
      <View style={styles.portraitSpacer} />
      <ToolDock
        tool={tool}
        onToolChange={setTool}
        penColor={penColor}
        onPenColorChange={setPenColor}
        penSize={penSize}
        onPenSizeChange={setPenSize}
        eraserSize={eraserSize}
        onEraserSizeChange={setEraserSize}
        onionEnabled={onionEnabled}
        onToggleOnion={() => setOnionEnabled((value) => !value)}
        onionOpacityPercent={onionOpacityPercent}
        onOnionOpacityPercentChange={setOnionOpacityPercent}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
      <View style={styles.flexFill} />
      <View style={styles.portraitActions}>
        <Button title="미리보기" onPress={() => router.push(`/project/${project.id}/preview`)} style={styles.portraitActionButton} />
        <Button title="영상 만들기" variant="primary" onPress={() => router.push(`/project/${project.id}/render`)} style={styles.portraitActionButton} />
      </View>
    </AppSurface>
  );
}

const styles = StyleSheet.create({
  missingProjectSurface: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  missingProjectText: {
    color: theme.color.muted,
    textAlign: "center",
  },
  missingProjectButton: {
    marginTop: 16,
  },
  surface: {},
  header: {
    justifyContent: "center",
  },
  landscapeTitle: {
    color: theme.color.graphite,
    fontFamily: theme.font.displayBold,
    fontSize: 26,
    lineHeight: 34,
  },
  landscapeSubtitle: {
    color: theme.color.muted,
    fontSize: 13,
  },
  landscapeStudio: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  framePanel: {
    alignSelf: "stretch",
    borderRadius: theme.radius.md,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
  },
  framePanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  framePanelTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  framePanelTitle: {
    color: theme.color.graphite,
    fontFamily: theme.font.displayBold,
  },
  sheetCount: {
    color: theme.color.muted,
  },
  frameEditActions: {
    flexDirection: "row",
    gap: 10,
  },
  frameEditActionButton: {
    flex: 1,
  },
  landscapeActions: {
    marginTop: "auto",
  },
  landscapeActionButton: {
    justifyContent: "center",
  },
  landscapeRowActionButton: {
    flex: 1,
  },
  landscapeColumnActionButton: {
    width: "78%",
    alignSelf: "center",
  },
  portraitTitle: {
    color: theme.color.graphite,
    fontFamily: theme.font.displayBold,
    fontSize: 22,
    lineHeight: 30,
  },
  portraitSubtitle: {
    color: theme.color.muted,
    fontSize: 11,
  },
  canvasStage: {
    alignItems: "center",
  },
  portraitSpacer: {
    height: 14,
  },
  flexFill: {
    flex: 1,
  },
  portraitActions: {
    flexDirection: "row",
    gap: 17,
  },
  portraitActionButton: {
    flex: 1,
  },
  saveStatusBanner: {
    position: "absolute",
    right: 14,
    top: 10,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.color.vermilion,
    backgroundColor: theme.color.paper,
  },
  saveStatusText: {
    color: theme.color.vermilion,
    fontSize: 11,
    fontWeight: "700",
  },
});
