import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

import { AppSurface } from "../../../src/components/app-surface";
import { Button } from "../../../src/components/button";
import { MaskingTape } from "../../../src/components/notebook-paper";
import { ScreenHeader } from "../../../src/components/screen-header";
import { goBackOrReplace } from "../../../src/navigation/go-back";
import { useProjectActions } from "../../../src/state/project-store";
import { shadow } from "../../../src/shadow";
import { theme } from "../../../src/theme";

export default function NewProjectScreen() {
  const { width } = useWindowDimensions();
  const { createProject } = useProjectActions();
  const [title, setTitle] = useState("책상 모서리 달리기");
  const contentWidth = Math.min(width - 46, 520);

  function handleCreate() {
    const project = createProject(title);
    router.replace(`/project/${project.id}/draw`);
  }

  return (
    <AppSurface>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scrollContent}>
        <View style={[styles.content, { width: contentWidth }]}>
          <ScreenHeader
            title="새 플립북"
            subtitle="정사각형 종이 한 장에서 바로 시작합니다."
            onBack={() => goBackOrReplace("/")}
          />

          <View style={styles.formCard}>
            <MaskingTape corner="left" tone="success" />
            <View style={styles.field}>
              <Text selectable={false} style={styles.label}>
                제목
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="새 플립북"
                placeholderTextColor={theme.color.muted}
                style={styles.input}
              />
            </View>

          </View>

          <Button title="그리기 시작" variant="primary" onPress={handleCreate} />
          <Button title="라이브러리로 돌아가기" onPress={() => goBackOrReplace("/")} />
        </View>
      </ScrollView>
    </AppSurface>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 23,
    alignItems: "center",
  },
  content: {
    gap: 22,
    paddingTop: 24,
  },
  header: {
    gap: 4,
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
  formCard: {
    gap: 18,
    padding: 18,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  field: {
    gap: 8,
  },
  label: {
    color: theme.color.graphite,
    fontFamily: theme.font.displayBold,
    fontSize: 15,
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
});
