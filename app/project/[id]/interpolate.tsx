import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { captureRef } from "react-native-view-shot";

import { createReward, submitInterpolation, waitForGrantedReward, waitForInterpolation } from "../../../src/ai/api-client";
import { getClientInstanceId } from "../../../src/ai/client-instance";
import { discardGeneratedAssets, downloadGeneratedAssets } from "../../../src/ai/generated-assets";
import { showRewardedInterpolationAd } from "../../../src/ads/rewarded";
import { Button } from "../../../src/components/button";
import { FrameComposite } from "../../../src/components/frame-composite";
import { ProjectLoadState } from "../../../src/components/project-load-state";
import { ScreenHeader } from "../../../src/components/screen-header";
import { insertGeneratedFrames, interpolationTimes } from "../../../src/model/interpolation";
import { goBackOrReplace } from "../../../src/navigation/go-back";
import { useProject, useProjectActions } from "../../../src/state/project-store";
import { resolveFrameAssetUri } from "../../../src/storage/frame-assets";
import { theme } from "../../../src/theme";
import { createId } from "../../../src/utils/id";

type ScreenStatus = "idle" | "ad" | "reward" | "capture" | "generating" | "preview" | "error";

type GeneratedPreview = {
  assetPath: string;
  time: number;
};

function statusCopy(status: ScreenStatus): string {
  if (status === "ad") return "리워드 광고를 불러오고 있습니다.";
  if (status === "reward") return "광고 보상을 확인하고 있습니다.";
  if (status === "capture") return "두 프레임을 준비하고 있습니다.";
  if (status === "generating") return "RIFE CNN이 중간 장면을 생성하고 있습니다.";
  return "광고 1회로 선택한 구간의 중간 프레임을 한 번 생성합니다.";
}

export default function InterpolateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { ready, project } = useProject(id);
  const { updateProject } = useProjectActions();
  const [leftFrameId, setLeftFrameId] = useState("");
  const [frameCount, setFrameCount] = useState<1 | 2 | 3>(1);
  const [status, setStatus] = useState<ScreenStatus>("idle");
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState("");
  const [generated, setGenerated] = useState<GeneratedPreview[]>([]);
  const startCaptureRef = useRef<View>(null);
  const endCaptureRef = useRef<View>(null);
  const contentWidth = Math.min(width - 46, 720);
  const sourceSize = Math.min(260, Math.max(104, (contentWidth - 36) / 2));
  const pairs = useMemo(
    () => project?.frames.slice(0, -1).map((frame, index) => ({ left: frame, right: project.frames[index + 1] })) ?? [],
    [project],
  );
  const selectedPair = pairs.find((pair) => pair.left.id === leftFrameId) ?? pairs[0];
  const busy = status === "ad" || status === "reward" || status === "capture" || status === "generating";

  useEffect(() => {
    if (pairs.length > 0 && !pairs.some((pair) => pair.left.id === leftFrameId)) {
      setLeftFrameId(pairs[0].left.id);
    }
  }, [leftFrameId, pairs]);

  if (!project) {
    return <ProjectLoadState ready={ready} width={contentWidth} onBack={() => router.replace("/")} />;
  }

  const activeProject = project;

  async function captureSource(ref: React.RefObject<View | null>): Promise<string> {
    const base64 = await captureRef(ref, {
      format: "png",
      quality: 1,
      width: 360,
      height: 360,
      result: "base64",
    });
    return `data:image/png;base64,${base64}`;
  }

  async function receiveGeneratedFrames(activeRequestId: string, clientInstanceId: string) {
    const imageUrls = await waitForInterpolation(activeRequestId, clientInstanceId);
    const assetPaths = await downloadGeneratedAssets(imageUrls, activeRequestId);
    setGenerated(
      assetPaths.map((assetPath, index) => ({
        assetPath,
        time: interpolationTimes(assetPaths.length)[index],
      })),
    );
    setStatus("preview");
  }

  async function handleGenerate() {
    if (!selectedPair || !startCaptureRef.current || !endCaptureRef.current) {
      return;
    }

    setMessage("");
    setStatus("ad");
    try {
      const clientInstanceId = await getClientInstanceId();
      const rewardNonce = await createReward(clientInstanceId);
      await showRewardedInterpolationAd(rewardNonce, clientInstanceId);
      setStatus("reward");
      await waitForGrantedReward(rewardNonce, clientInstanceId);

      setStatus("capture");
      const [startImage, endImage] = await Promise.all([
        captureSource(startCaptureRef),
        captureSource(endCaptureRef),
      ]);
      setStatus("generating");
      const nextRequestId = await submitInterpolation({
        clientInstanceId,
        rewardNonce,
        startImage,
        endImage,
        frameCount,
      });
      setRequestId(nextRequestId);
      await receiveGeneratedFrames(nextRequestId, clientInstanceId);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "AI 프레임 생성에 실패했습니다.");
    }
  }

  async function handleRetryDownload() {
    if (!requestId) {
      await handleGenerate();
      return;
    }
    setStatus("generating");
    setMessage("");
    try {
      await receiveGeneratedFrames(requestId, await getClientInstanceId());
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "생성 결과를 다시 받지 못했습니다.");
    }
  }

  function handleCancelPreview() {
    discardGeneratedAssets(generated.map((frame) => frame.assetPath));
    setGenerated([]);
    setRequestId("");
    setStatus("idle");
    setMessage("");
  }

  function handleApply() {
    if (!selectedPair || generated.length === 0) {
      return;
    }
    const timestamp = Date.now();
    const frames = insertGeneratedFrames(
      activeProject.frames,
      selectedPair.left.id,
      selectedPair.right.id,
      generated.map((frame) => ({
        id: createId("frame"),
        assetPath: frame.assetPath,
        time: frame.time,
        generatedAt: timestamp,
      })),
    );
    setGenerated([]);
    updateProject({ ...activeProject, frames });
    router.replace(`/project/${activeProject.id}/draw`);
  }

  if (!selectedPair) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ScreenHeader
          title="AI 중간 프레임"
          subtitle="인접한 프레임 두 장이 필요합니다."
          onBack={() => goBackOrReplace(`/project/${activeProject.id}/preview`)}
          style={[styles.header, { width: contentWidth }]}
        />
        <Text selectable style={[styles.emptyText, { width: contentWidth }]}>
          프레임을 한 장 더 그린 뒤 다시 시도해 주세요.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <ScreenHeader
        title="AI 중간 프레임"
        subtitle="RIFE CNN · 광고 리워드"
        onBack={() => goBackOrReplace(`/project/${activeProject.id}/preview`)}
        style={[styles.header, { width: contentWidth }]}
      />

      <View style={[styles.section, { width: contentWidth }]}>
        <Text selectable={false} style={styles.sectionTitle}>
          1. 인접 구간 선택
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pairList}>
          {pairs.map((pair) => {
            const selected = pair.left.id === selectedPair.left.id;
            return (
              <Pressable
                key={pair.left.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${pair.left.index + 1}번과 ${pair.right.index + 1}번 프레임 사이`}
                disabled={busy || status === "preview"}
                onPress={() => setLeftFrameId(pair.left.id)}
                style={[styles.pairButton, selected ? styles.pairButtonSelected : null]}
              >
                <Text selectable={false} style={styles.pairLabel}>
                  {String(pair.left.index + 1).padStart(3, "0")} → {String(pair.right.index + 1).padStart(3, "0")}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.sourceRow, { width: contentWidth }]}>
        <View ref={startCaptureRef} collapsable={false}>
          <FrameComposite frame={selectedPair.left} size={sourceSize} />
        </View>
        <Text selectable={false} style={styles.arrow}>
          →
        </Text>
        <View ref={endCaptureRef} collapsable={false}>
          <FrameComposite frame={selectedPair.right} size={sourceSize} />
        </View>
      </View>

      {status === "preview" ? (
        <View style={[styles.section, { width: contentWidth }]}>
          <Text selectable={false} style={styles.sectionTitle}>
            생성 미리보기
          </Text>
          <View style={styles.generatedRow}>
            {generated.map((frame) => (
              <Image
                key={frame.assetPath}
                source={{ uri: resolveFrameAssetUri(frame.assetPath) }}
                contentFit="cover"
                style={[styles.generatedImage, { width: Math.min(180, (contentWidth - 28) / generated.length) }]}
              />
            ))}
          </View>
          <Text selectable style={styles.helperText}>
            적용하면 이미지는 고정 배경이 되고, 그 위의 펜·지우개 스트로크는 계속 편집할 수 있습니다.
          </Text>
          <View style={styles.actionRow}>
            <Button title="전체 취소" onPress={handleCancelPreview} style={styles.actionButton} />
            <Button title="전체 적용" variant="primary" onPress={handleApply} style={styles.actionButton} />
          </View>
        </View>
      ) : (
        <View style={[styles.section, { width: contentWidth }]}>
          <Text selectable={false} style={styles.sectionTitle}>
            2. 생성할 프레임 수
          </Text>
          <View style={styles.countRow}>
            {([1, 2, 3] as const).map((count) => (
              <Button
                key={count}
                compact
                title={`${count}장`}
                variant={frameCount === count ? "primary" : "secondary"}
                disabled={busy}
                onPress={() => setFrameCount(count)}
                style={styles.countButton}
              />
            ))}
          </View>
          <Text selectable style={styles.helperText}>
            {statusCopy(status)}
          </Text>
          {busy ? <ActivityIndicator color={theme.color.deepBlue} /> : null}
          {message ? (
            <Text selectable style={styles.errorText}>
              {message}
            </Text>
          ) : null}
          <Button
            title={status === "error" ? (requestId ? "결과 다시 받기" : "다시 시도") : "광고 보고 AI 생성"}
            variant="primary"
            disabled={busy}
            onPress={status === "error" ? handleRetryDownload : handleGenerate}
          />
          <Text selectable style={styles.privacyText}>
            선택한 두 프레임만 AI 처리업체로 전송되며, 프로젝트와 완성 영상은 서버에 저장하지 않습니다.
          </Text>
        </View>
      )}
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
    gap: 18,
  },
  header: {
    paddingTop: 24,
  },
  section: {
    gap: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.paper,
  },
  sectionTitle: {
    color: theme.color.graphite,
    fontSize: 15,
    fontWeight: "700",
  },
  pairList: {
    gap: 8,
  },
  pairButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.paperSoft,
  },
  pairButtonSelected: {
    borderColor: theme.color.deepBlue,
  },
  pairLabel: {
    color: theme.color.graphite,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  arrow: {
    color: theme.color.vermilion,
    fontSize: 20,
    fontWeight: "700",
  },
  countRow: {
    flexDirection: "row",
    gap: 8,
  },
  countButton: {
    flex: 1,
  },
  generatedRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  generatedImage: {
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.color.hairline,
  },
  helperText: {
    color: theme.color.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  privacyText: {
    color: theme.color.muted,
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
  },
  errorText: {
    color: theme.color.vermilion,
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  emptyText: {
    padding: 20,
    color: theme.color.muted,
    textAlign: "center",
  },
});
