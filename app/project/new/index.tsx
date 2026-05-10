import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

import { AppSurface } from "../../../src/components/app-surface";
import { Button } from "../../../src/components/button";
import { ScreenHeader } from "../../../src/components/screen-header";
import { goBackOrReplace } from "../../../src/navigation/go-back";
import { useProjectActions } from "../../../src/state/project-store";
import { shadow, theme } from "../../../src/theme";

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
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "300",
  },
  subtitle: {
    color: theme.color.muted,
    fontSize: 12,
  },
  formCard: {
    gap: 18,
    padding: 18,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
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
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paperSoft,
    color: theme.color.graphite,
    fontSize: 15,
  },
});
