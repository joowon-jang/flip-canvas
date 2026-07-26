import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Button } from "../../../src/components/button";
import { FpsInput, type FpsValue } from "../../../src/components/fps-input";
import { ProjectLoadState } from "../../../src/components/project-load-state";
import { ScreenHeader } from "../../../src/components/screen-header";
import { goBackOrReplace } from "../../../src/navigation/go-back";
import { uploadProjectShare } from "../../../src/share/upload-share";
import { useProject, useProjectActions } from "../../../src/state/project-store";
import { theme } from "../../../src/theme";

export default function RenderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { ready, project } = useProject(id);
  const { updateProject } = useProjectActions();
  const fps = project?.fps ?? 12;
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const contentWidth = Math.min(width - 46, 520);

  if (!project) {
    return <ProjectLoadState ready={ready} width={contentWidth} onBack={() => router.replace("/")} />;
  }

  const activeProject = project;

  function handleFpsChange(nextFps: FpsValue) {
    updateProject({ ...activeProject, fps: nextFps });
  }

  async function handleRender() {
    setStatus("uploading");
    setMessage("");
    try {
      const projectForUpload = { ...activeProject, fps };
      const plan = await uploadProjectShare(projectForUpload, setProgress);
      updateProject({ ...projectForUpload, shareId: plan.shareId, shareUrl: plan.playerUrl });
      setStatus("done");
      router.replace(`/project/${activeProject.id}/share`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <ScreenHeader
        title="영상 만들기"
        subtitle="프레임을 업로드하고 웹 플레이어 링크를 만듭니다."
        onBack={() => goBackOrReplace(`/project/${project.id}/draw`)}
        style={[styles.header, { width: contentWidth }]}
      />

      <View style={[styles.fpsCard, { width: contentWidth }]}>
        <FpsInput value={fps} onChange={handleFpsChange} title="영상 재생 속도" disabled={status === "uploading"} />
        <Text selectable style={styles.helperText}>
          공유 링크의 웹 플레이어와 manifest에 {fps} fps로 저장됩니다.
        </Text>
      </View>

      <View style={[styles.progressCard, { width: contentWidth }]}>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text selectable style={styles.statusText}>
          {status === "uploading" ? `업로드 중 ${Math.round(progress * 100)}%` : "웹 링크로 공유할 준비가 되었습니다."}
        </Text>
        {status === "uploading" ? <ActivityIndicator color={theme.color.deepBlue} /> : null}
        {message ? (
          <Text selectable style={styles.errorText}>
            {message}
          </Text>
        ) : null}
      </View>

      <Button
        title={status === "error" ? "다시 시도" : "렌더링 시작"}
        variant="primary"
        onPress={handleRender}
        disabled={status === "uploading"}
        style={[styles.fullWidth, { width: contentWidth }]}
      />
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
    gap: 22,
  },
  header: {
    gap: 4,
    paddingTop: 24,
  },
  title: {
    color: theme.color.graphite,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "300",
  },
  subtitle: {
    color: theme.color.muted,
    fontSize: 12,
  },
  fpsCard: {
    gap: 10,
    padding: 20,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
  },
  helperText: {
    color: theme.color.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  progressCard: {
    gap: 18,
    padding: 20,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.color.progressTrack,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: theme.color.deepBlue,
  },
  statusText: {
    color: theme.color.graphite,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: theme.color.vermilion,
    fontSize: 12,
    lineHeight: 18,
  },
  fullWidth: {
    alignSelf: "center",
  },
});
