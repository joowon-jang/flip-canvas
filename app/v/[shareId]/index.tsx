import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { FlipPlayer } from "../../../src/components/flip-player";
import { ScreenHeader } from "../../../src/components/screen-header";
import { goBackOrReplace } from "../../../src/navigation/go-back";
import { theme } from "../../../src/theme";
import type { ShareManifest } from "../../../src/types/flipbook";

export default function WebPlayerScreen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>();
  const { width, height } = useWindowDimensions();
  const [manifest, setManifest] = useState<ShareManifest | null>(null);
  const [error, setError] = useState("");
  const contentWidth = Math.min(width - 46, 760);
  const playerSize = Math.min(contentWidth, height * 0.62, 640);

  useEffect(() => {
    if (!shareId) {
      setError("공유 manifest 주소를 찾을 수 없습니다.");
      return;
    }

    fetch(`/api/shares/${shareId}/manifest`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`manifest fetch failed: ${response.status}`);
        }
        return response.json() as Promise<ShareManifest>;
      })
      .then(setManifest)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "플레이어를 불러오지 못했습니다."));
  }, [shareId]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { minHeight: height }]}
    >
      <ScreenHeader
        title={manifest?.title ?? "Flip Canvas"}
        subtitle={manifest ? `${manifest.frameCount} frames` : "loading shared notebook"}
        onBack={() => goBackOrReplace("/")}
        style={[styles.header, { width: contentWidth }]}
      />
      {manifest ? <FlipPlayer manifest={manifest} size={playerSize} /> : <ActivityIndicator color={theme.color.deepBlue} />}
      {error ? (
        <Text selectable style={[styles.errorText, { width: contentWidth }]}>
          {error}
        </Text>
      ) : null}
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
    justifyContent: "center",
    gap: 18,
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
  errorText: {
    color: theme.color.vermilion,
    fontSize: 12,
    textAlign: "center",
  },
});
