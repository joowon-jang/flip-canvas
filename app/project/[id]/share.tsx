import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Share, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Button } from "../../../src/components/button";
import { MaskingTape } from "../../../src/components/notebook-paper";
import { ProjectLoadState } from "../../../src/components/project-load-state";
import { ScreenHeader } from "../../../src/components/screen-header";
import { goBackOrReplace } from "../../../src/navigation/go-back";
import { useProject } from "../../../src/state/project-store";
import { shadow } from "../../../src/shadow";
import { theme } from "../../../src/theme";

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { ready, project } = useProject(id);
  const [copyStatus, setCopyStatus] = useState("");
  const contentWidth = Math.min(width - 46, 520);

  if (!project) {
    return <ProjectLoadState ready={ready} width={contentWidth} onBack={() => router.replace("/")} />;
  }

  const url = project.shareUrl ?? (project.shareId ? `${process.env.EXPO_PUBLIC_APP_PUBLIC_BASE_URL ?? ""}/v/${project.shareId}` : "");

  async function handleShare() {
    if (!url) {
      return;
    }
    await Share.share({ url, message: url });
  }

  async function handleCopy() {
    if (!url) {
      return;
    }
    await Clipboard.setStringAsync(url);
    setCopyStatus("복사됨 ✓");
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <ScreenHeader
        title="공유 링크"
        subtitle="카카오톡, LINE, 메시지 앱으로 웹 플레이어 링크를 공유합니다."
        onBack={() => goBackOrReplace(`/project/${project.id}/draw`)}
        style={[styles.header, { width: contentWidth }]}
      />

      <View style={[styles.card, { width: contentWidth }]}>
        <MaskingTape corner="left" tone="primary" />
        <Text selectable style={styles.urlText}>
          {url || "아직 공유 링크가 없습니다."}
        </Text>
      </View>

      <Button title="공유하기" variant="primary" onPress={handleShare} disabled={!url} style={[styles.fullWidth, { width: contentWidth }]} />
      <Button title="링크 복사" onPress={handleCopy} disabled={!url} style={[styles.fullWidth, { width: contentWidth }]} />
      {copyStatus ? (
        <Text selectable={false} style={[styles.copyStatus, { width: contentWidth }]}>
          {copyStatus}
        </Text>
      ) : null}
      <Button title="플레이어 열기" disabled={!project.shareId} onPress={() => router.push(`/v/${project.shareId}`)} style={[styles.fullWidth, { width: contentWidth }]} />
      {!url ? <Button title="영상 만들기" onPress={() => router.replace(`/project/${project.id}/render`)} style={[styles.fullWidth, { width: contentWidth }]} /> : null}
      <Button title="계속 그리기" onPress={() => router.replace(`/project/${project.id}/draw`)} style={[styles.fullWidth, { width: contentWidth }]} />
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
    fontFamily: theme.font.displayBold,
    fontSize: 28,
    lineHeight: 36,
  },
  subtitle: {
    color: theme.color.muted,
    fontSize: 13,
  },
  card: {
    gap: 14,
    padding: 18,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  urlText: {
    color: theme.color.graphiteSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  fullWidth: {
    alignSelf: "center",
  },
  copyStatus: {
    color: theme.color.green,
    fontFamily: theme.font.displayBold,
    fontSize: 14,
    textAlign: "center",
  },
});
