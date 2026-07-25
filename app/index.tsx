import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

import { AppSurface } from "../src/components/app-surface";
import { Button } from "../src/components/button";
import { MaskingTape, NotebookPaper } from "../src/components/notebook-paper";
import { StrokePreview } from "../src/components/stroke-preview";
import { useProject, useProjectActions, useProjectSummaries } from "../src/state/project-store";
import { shadow } from "../src/shadow";
import { theme } from "../src/theme";
import type { FlipFrame, ProjectSummary } from "../src/types/flipbook";

const RECENT_PROJECT_LIMIT = 8;

export default function LibraryScreen() {
  const { width } = useWindowDimensions();
  const { ready, projects } = useProjectSummaries();
  const [managedProject, setManagedProject] = useState<ProjectSummary | undefined>();
  const [managedTitle, setManagedTitle] = useState("");
  const contentWidth = Math.min(width - 46, 720);
  const recentProjects = useMemo(() => projects.slice(0, RECENT_PROJECT_LIMIT), [projects]);

  function handleOpenManagement(project: ProjectSummary) {
    setManagedProject(project);
    setManagedTitle(project.title);
  }

  function handleCloseManagement() {
    setManagedProject(undefined);
    setManagedTitle("");
  }

  if (!ready) {
    return (
      <AppSurface style={styles.centeredSurface}>
        <ActivityIndicator color={theme.color.deepBlue} />
      </AppSurface>
    );
  }

  return (
    <AppSurface>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { width: contentWidth }]}>
          <Text selectable={false} style={styles.title}>
            Flip Canvas
          </Text>
          <Text selectable style={styles.subtitle}>
            notebook animation studio
          </Text>
        </View>

        <NotebookPaper tapeLeft="primary" tapeRight="success" style={[styles.heroPaper, { width: contentWidth, height: Math.min(208, contentWidth * 0.62), aspectRatio: undefined }]}>
          <View style={styles.heroContent}>
            <Text selectable={false} style={styles.heroTitle}>
              Corner{"\n"}drawings,{"\n"}made cinematic.
            </Text>
            <Text selectable style={styles.heroCopy}>
              프레임을 그리고 책장을 넘기듯 영상으로 공유합니다.
            </Text>
          </View>
        </NotebookPaper>

        <Button title="새 플립북" variant="primary" onPress={() => router.push("/project/new")} style={[styles.fullWidth, { width: contentWidth }]} />

        <View style={[styles.recentSection, { width: contentWidth }]}>
          <Text selectable={false} style={styles.sectionTitle}>
            Recent
          </Text>
          {recentProjects.map((project) => {
            return (
              <ProjectCard key={project.id} project={project} onManage={handleOpenManagement} />
            );
          })}
        </View>
      </ScrollView>
      <ProjectManagementModal
        project={managedProject}
        title={managedTitle}
        onTitleChange={setManagedTitle}
        onClose={handleCloseManagement}
      />
    </AppSurface>
  );
}

function ProjectCard({ project, onManage }: { project: ProjectSummary; onManage: (project: ProjectSummary) => void }) {
  return (
    <View style={styles.projectCard}>
      <Pressable
        onPress={() => router.push(`/project/${project.id}/draw`)}
        style={({ pressed }) => [styles.projectOpenArea, pressed ? styles.projectCardPressed : null]}
      >
        <NotebookPaper fold={false} style={styles.projectThumb}>
          <ProjectCardPreview projectId={project.id} previewFrame={project.previewFrame} />
        </NotebookPaper>
        <View style={styles.projectBody}>
          <Text selectable={false} style={styles.projectTitle}>
            {project.title}
          </Text>
          <Text selectable style={styles.projectMeta}>
            {project.frameCount} frames
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${Math.min(100, Math.max(12, project.frameCount * 4))}%` }]}
            />
          </View>
        </View>
        <Text selectable={false} style={styles.openLabel}>
          Open
        </Text>
      </Pressable>
      <Button compact title="관리" onPress={() => onManage(project)} style={styles.manageButton} />
    </View>
  );
}

function ProjectManagementModal({
  project,
  title,
  onTitleChange,
  onClose,
}: {
  project?: ProjectSummary;
  title: string;
  onTitleChange: (title: string) => void;
  onClose: () => void;
}) {
  const projectId = project?.id ?? "";
  const { ready, project: loadedProject } = useProject(projectId);
  const { renameProject, duplicateProject, deleteProject } = useProjectActions();
  const loaded = ready && Boolean(loadedProject);

  if (!project) {
    return null;
  }

  const activeProject = project;

  function handleRename() {
    renameProject(activeProject.id, title);
    onClose();
  }

  function handleDuplicate() {
    duplicateProject(activeProject.id);
    onClose();
  }

  function handleDelete() {
    Alert.alert("프로젝트 삭제", `"${activeProject.title}"을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          deleteProject(activeProject.id);
          onClose();
        },
      },
    ]);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.managementPanel}>
          <MaskingTape corner="left" tone="primary" />
          <View style={styles.managementHeader}>
            <Text selectable={false} style={styles.managementTitle}>
              프로젝트 관리
            </Text>
            <Text selectable style={styles.managementMeta}>
              {activeProject.frameCount} frames
            </Text>
          </View>
          <View style={styles.field}>
            <Text selectable={false} style={styles.label}>
              이름
            </Text>
            <TextInput
              value={title}
              onChangeText={onTitleChange}
              placeholder="프로젝트 이름"
              placeholderTextColor={theme.color.muted}
              style={styles.input}
            />
          </View>
          <View style={styles.managementActions}>
            <Button title="이름 저장" variant="primary" disabled={!loaded} onPress={handleRename} style={styles.modalButton} />
            <Button title="복제" disabled={!loaded} onPress={handleDuplicate} style={styles.modalButton} />
            <Button title="삭제" variant="dark" onPress={handleDelete} style={styles.modalButton} />
            <Button title="닫기" onPress={onClose} style={styles.modalButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProjectCardPreview({ projectId, previewFrame }: { projectId: string; previewFrame?: FlipFrame }) {
  if ((previewFrame?.strokes.length ?? 0) > 0) {
    return <FirstFramePreview frame={previewFrame} />;
  }

  return <ProjectCardPreviewFallback projectId={projectId} previewFrame={previewFrame} />;
}

function ProjectCardPreviewFallback({ projectId, previewFrame }: { projectId: string; previewFrame?: FlipFrame }) {
  const { project: fallbackProject } = useProject(projectId);
  const summaryPreviewHasStrokes = (previewFrame?.strokes.length ?? 0) > 0;
  const firstFrame = summaryPreviewHasStrokes ? previewFrame : fallbackProject?.frames[0] ?? previewFrame;
  return <FirstFramePreview frame={firstFrame} />;
}

function FirstFramePreview({ frame }: { frame?: FlipFrame }) {
  return <StrokePreview strokes={frame?.strokes ?? []} scale={0.15} renderMode="pressure-lite" pointsPerPressureSegment={4} eraserRenderMode="paint" />;
}

const styles = StyleSheet.create({
  centeredSurface: {
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 23,
    gap: 24,
    alignItems: "center",
  },
  header: {
    gap: 4,
    paddingTop: 24,
  },
  title: {
    color: theme.color.graphite,
    fontFamily: theme.font.displayBold,
    fontSize: 30,
    lineHeight: 40,
  },
  subtitle: {
    color: theme.color.muted,
    fontSize: 13,
  },
  heroPaper: {
    backgroundColor: theme.color.paper,
  },
  heroContent: {
    padding: 28,
    gap: 12,
  },
  heroTitle: {
    color: theme.color.graphite,
    fontFamily: theme.font.displayBold,
    fontSize: 26,
    lineHeight: 34,
  },
  heroCopy: {
    color: theme.color.graphiteSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  fullWidth: {
    alignSelf: "center",
  },
  recentSection: {
    gap: 14,
  },
  sectionTitle: {
    color: theme.color.graphite,
    fontFamily: theme.font.displayBold,
    fontSize: 17,
    lineHeight: 23,
  },
  projectCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  projectOpenArea: {
    flex: 1,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  projectCardPressed: {
    opacity: 0.72,
  },
  projectThumb: {
    width: 54,
    height: 54,
  },
  projectBody: {
    flex: 1,
    gap: 5,
  },
  projectTitle: {
    color: theme.color.graphite,
    fontSize: 14,
    fontWeight: "700",
  },
  projectMeta: {
    color: theme.color.muted,
    fontSize: 11,
  },
  progressTrack: {
    width: 140,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.color.progressTrack,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.color.deepBlue,
  },
  openLabel: {
    color: theme.color.deepBlue,
    fontFamily: theme.font.displayBold,
    fontSize: 14,
  },
  manageButton: {
    minWidth: 58,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 23,
    backgroundColor: theme.color.scrim,
  },
  managementPanel: {
    width: "100%",
    maxWidth: 420,
    gap: 18,
    padding: 18,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  managementHeader: {
    gap: 4,
  },
  managementTitle: {
    color: theme.color.graphite,
    fontFamily: theme.font.displayBold,
    fontSize: 22,
    lineHeight: 30,
  },
  managementMeta: {
    color: theme.color.muted,
    fontSize: 12,
  },
  field: {
    gap: 8,
  },
  label: {
    color: theme.color.graphite,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paperSoft,
    color: theme.color.graphite,
    fontSize: 15,
  },
  managementActions: {
    gap: 10,
  },
  modalButton: {
    width: "100%",
  },
});
