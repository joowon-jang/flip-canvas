import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Button } from "../../../src/components/button";
import { FrameGrid } from "../../../src/components/frame-strip";
import { ProjectLoadState } from "../../../src/components/project-load-state";
import { ScreenHeader } from "../../../src/components/screen-header";
import { addFrameToEnd, duplicateFrame, moveFrame, removeFrame } from "../../../src/model/frame-actions";
import { goBackOrReplace } from "../../../src/navigation/go-back";
import { useProject, useProjectActions } from "../../../src/state/project-store";
import { shadow } from "../../../src/shadow";
import { theme } from "../../../src/theme";
import { createId, now } from "../../../src/utils/id";

export default function FramesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { ready, project } = useProject(id);
  const { updateProject } = useProjectActions();
  const [selectedFrameId, setSelectedFrameId] = useState(project?.frames[0]?.id ?? "");
  const contentWidth = Math.min(width - 46, 680);

  if (!project) {
    return <ProjectLoadState ready={ready} width={contentWidth} onBack={() => router.replace("/")} />;
  }

  const activeProject = project;
  const selectedFrame = activeProject.frames.find((frame) => frame.id === selectedFrameId) ?? activeProject.frames[0];
  const selectedIndex = selectedFrame.index;

  function updateFrames(frames: typeof activeProject.frames, nextSelectedFrameId = selectedFrame.id) {
    updateProject({ ...activeProject, frames });
    setSelectedFrameId(nextSelectedFrameId);
  }

  function handleDuplicateFrame(frameId: string) {
    if (!activeProject.frames.some((frame) => frame.id === frameId)) {
      return;
    }

    const duplicatedFrameId = createId("frame");
    updateFrames(duplicateFrame(activeProject.frames, frameId, () => duplicatedFrameId, now), duplicatedFrameId);
  }

  function handleAddFrame() {
    const addedFrameId = createId("frame");
    updateFrames(addFrameToEnd(activeProject.frames, () => addedFrameId, now), addedFrameId);
  }

  function handleMoveFrame(delta: number) {
    updateFrames(moveFrame(activeProject.frames, selectedIndex, selectedIndex + delta));
  }

  function handleMoveFrameToIndex(frameId: string, toIndex: number) {
    const sourceIndex = activeProject.frames.findIndex((frame) => frame.id === frameId);
    if (sourceIndex === -1) {
      return;
    }

    updateFrames(moveFrame(activeProject.frames, sourceIndex, toIndex), frameId);
  }

  function handleRemoveFrame(frameId: string) {
    const removedFrame = activeProject.frames.find((frame) => frame.id === frameId);
    if (!removedFrame || activeProject.frames.length <= 1) {
      return;
    }

    const nextFrames = removeFrame(activeProject.frames, frameId);
    const currentFrame = nextFrames.find((frame) => frame.id === selectedFrame.id);
    const nextSelectedFrame = frameId === selectedFrame.id ? nextFrames[Math.min(removedFrame.index, nextFrames.length - 1)] ?? nextFrames[0] : currentFrame ?? nextFrames[0];
    updateFrames(nextFrames, nextSelectedFrame.id);
  }

  function confirmDuplicateFrame() {
    Alert.alert("프레임 복제", "선택한 프레임을 복제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "복제", onPress: () => handleDuplicateFrame(selectedFrame.id) },
    ]);
  }

  function confirmRemoveFrame() {
    if (activeProject.frames.length <= 1) {
      return;
    }

    Alert.alert("프레임 삭제", "선택한 프레임을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => handleRemoveFrame(selectedFrame.id) },
    ]);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <ScreenHeader
        title="프레임 관리"
        subtitle="복제, 삭제, 순서 변경 후 드로잉 화면으로 돌아갑니다."
        onBack={() => goBackOrReplace(`/project/${activeProject.id}/draw`)}
        style={[styles.header, { width: contentWidth }]}
      />

      <View style={[styles.card, { width: contentWidth }]}>
        <FrameGrid
          frames={activeProject.frames}
          currentFrameId={selectedFrame.id}
          onSelect={setSelectedFrameId}
          onMoveFrame={handleMoveFrameToIndex}
          gridWidth={contentWidth - 36}
        />
        <View style={styles.actions}>
          <Button compact title="선택 프레임 복제" onPress={confirmDuplicateFrame} />
          <Button compact title="맨 뒤에 추가" onPress={handleAddFrame} />
          <Button compact title="앞으로" disabled={selectedIndex <= 0} onPress={() => handleMoveFrame(-1)} />
          <Button compact title="뒤로" disabled={selectedIndex >= activeProject.frames.length - 1} onPress={() => handleMoveFrame(1)} />
          <Button compact title="삭제" disabled={activeProject.frames.length <= 1} onPress={confirmRemoveFrame} />
        </View>
      </View>

      <Button title="드로잉으로 돌아가기" variant="primary" onPress={() => goBackOrReplace(`/project/${activeProject.id}/draw`)} style={[styles.fullWidth, { width: contentWidth }]} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: theme.color.linen,
  },
  scrollContent: {
    padding: 23,
    alignItems: "center",
    gap: 20,
  },
  header: {
    gap: 4,
    paddingTop: 24,
  },
  title: {
    color: theme.color.graphite,
    fontFamily: theme.font.displayBold,
    fontSize: 28,
    lineHeight: 36,
  },
  subtitle: {
    color: theme.color.muted,
    fontSize: 13,
  },
  card: {
    padding: 18,
    gap: 18,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  fullWidth: {
    alignSelf: "center",
  },
});
