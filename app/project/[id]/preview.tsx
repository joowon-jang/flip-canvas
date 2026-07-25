import { router, useLocalSearchParams, type Href } from "expo-router";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Button } from "../../../src/components/button";
import { FpsInput, type FpsValue } from "../../../src/components/fps-input";
import { LocalFlipPlayer } from "../../../src/components/local-flip-player";
import { ProjectLoadState } from "../../../src/components/project-load-state";
import { ScreenHeader } from "../../../src/components/screen-header";
import { goBackOrReplace } from "../../../src/navigation/go-back";
import { useProject, useProjectActions } from "../../../src/state/project-store";
import { shadow } from "../../../src/shadow";
import { theme } from "../../../src/theme";

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width, height } = useWindowDimensions();
  const { ready, project } = useProject(id);
  const { updateProject } = useProjectActions();
  const fps = project?.fps ?? 12;
  const contentWidth = Math.min(width - 46, 760);
  const playerSize = Math.min(contentWidth, height * 0.56, 640);

  if (!project) {
    return <ProjectLoadState ready={ready} width={contentWidth} onBack={() => router.replace("/")} />;
  }

  const activeProject = project;

  function handleFpsChange(nextFps: FpsValue) {
    updateProject({ ...activeProject, fps: nextFps });
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <ScreenHeader
        title="미리보기"
        subtitle={`${project.frames.length} frames · ${fps} fps`}
        onBack={() => goBackOrReplace(`/project/${project.id}/draw`)}
        style={[styles.header, { width: contentWidth }]}
      />

      <LocalFlipPlayer frames={project.frames} fps={fps} size={playerSize} />

      <View style={[styles.fpsCard, { width: contentWidth }]}>
        <FpsInput value={fps} onChange={handleFpsChange} title="미리보기 속도" />
      </View>

      <View style={[styles.actions, { width: contentWidth }]}>
        <Button
          title="AI 중간 프레임"
          disabled={project.frames.length < 2}
          onPress={() => router.push(`/project/${project.id}/interpolate` as Href)}
          style={styles.actionButton}
        />
        <Button title="영상 만들기" variant="primary" onPress={() => router.push(`/project/${project.id}/render`)} style={styles.actionButton} />
      </View>
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
  fpsCard: {
    padding: 14,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
