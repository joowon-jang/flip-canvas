import VideoEncoderModule from "@modules/video-encoder";
import { File, Paths } from "expo-file-system";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { captureRef } from "react-native-view-shot";

import { Button } from "../../../src/components/button";
import { FpsInput, type FpsValue } from "../../../src/components/fps-input";
import { FrameComposite } from "../../../src/components/frame-composite";
import { MaskingTape } from "../../../src/components/notebook-paper";
import { ProjectLoadState } from "../../../src/components/project-load-state";
import { ScreenHeader } from "../../../src/components/screen-header";
import { goBackOrReplace } from "../../../src/navigation/go-back";
import { useProject, useProjectActions } from "../../../src/state/project-store";
import { shadow } from "../../../src/shadow";
import { resolveFrameAssetUri } from "../../../src/storage/frame-assets";
import { theme } from "../../../src/theme";

const VIDEO_BITRATE = 4_000_000;
const OUTPUT_SIZES = [480, 720, 1080] as const;

type RenderStatus = "idle" | "capturing" | "encoding" | "ready" | "saving" | "sharing" | "error";
type OutputFormat = "mp4" | "gif";
type OutputSize = (typeof OUTPUT_SIZES)[number];

function waitForFramePaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export default function RenderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { ready, project } = useProject(id);
  const { updateProject } = useProjectActions();
  const fps = project?.fps ?? 12;
  const [status, setStatus] = useState<RenderStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [outputUri, setOutputUri] = useState("");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("mp4");
  const [outputSize, setOutputSize] = useState<OutputSize>(720);
  const [captureFrameIndex, setCaptureFrameIndex] = useState(0);
  const captureViewRef = useRef<View>(null);
  const contentWidth = Math.min(width - 46, 520);
  const busy = status === "capturing" || status === "encoding" || status === "saving" || status === "sharing";

  if (!project) {
    return <ProjectLoadState ready={ready} width={contentWidth} onBack={() => router.replace("/")} />;
  }

  const activeProject = project;
  const captureFrame = activeProject.frames[captureFrameIndex] ?? activeProject.frames[0];

  function handleFpsChange(nextFps: FpsValue) {
    updateProject({ ...activeProject, fps: nextFps });
    resetOutput();
  }

  function resetOutput() {
    setOutputUri("");
    setStatus("idle");
    setProgress(0);
    setMessage("");
  }

  function handleFormatChange(nextFormat: OutputFormat) {
    if (nextFormat !== outputFormat) {
      setOutputFormat(nextFormat);
      resetOutput();
    }
  }

  function handleSizeChange(nextSize: OutputSize) {
    if (nextSize !== outputSize) {
      setOutputSize(nextSize);
      resetOutput();
    }
  }

  async function captureFrames(): Promise<string[]> {
    const backgroundUris = activeProject.frames
      .map((frame) => frame.background?.assetPath)
      .filter((assetPath): assetPath is string => Boolean(assetPath))
      .map(resolveFrameAssetUri);
    await Promise.all(backgroundUris.map((uri) => Image.prefetch(uri)));

    const frameUris: string[] = [];
    for (let index = 0; index < activeProject.frames.length; index += 1) {
      setCaptureFrameIndex(index);
      await waitForFramePaint();
      const frameUri = await captureRef(captureViewRef, {
        format: "png",
        quality: 1,
        width: outputSize,
        height: outputSize,
        result: "tmpfile",
      });
      frameUris.push(frameUri);
      setProgress(((index + 1) / activeProject.frames.length) * 0.4);
    }
    return frameUris;
  }

  async function handleRender() {
    setStatus("capturing");
    setMessage("");
    setOutputUri("");
    setProgress(0);
    let capturedFrames: string[] = [];
    try {
      capturedFrames = await captureFrames();
      setStatus("encoding");
      const progressSubscription = VideoEncoderModule.addListener("onProgress", ({ progress: encodedProgress }) => {
        setProgress(0.4 + encodedProgress * 0.6);
      });
      const outputFile = new File(Paths.cache, `flipcanvas-${activeProject.id}-${Date.now()}.${outputFormat}`);
      try {
        const commonOptions = {
          frameUris: capturedFrames,
          outputPath: outputFile.uri,
          width: outputSize,
          height: outputSize,
          fps,
        };
        const result =
          outputFormat === "gif"
            ? await VideoEncoderModule.encodeGif(commonOptions)
            : await VideoEncoderModule.encodeMp4({
                ...commonOptions,
                bitrate: VIDEO_BITRATE,
              });
        setOutputUri(result.uri);
      } finally {
        progressSubscription.remove();
      }
      setProgress(1);
      setStatus("ready");
      setMessage("영상이 기기에서 완성되었습니다. 저장하거나 바로 공유할 수 있습니다.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "영상 만들기에 실패했습니다.");
    } finally {
      for (const uri of capturedFrames) {
        const file = new File(uri);
        if (file.exists) {
          file.delete();
        }
      }
    }
  }

  function handleSave() {
    if (!outputUri) {
      return;
    }
    Alert.alert(
      "사진 보관함에 저장할까요?",
      `${outputFormat.toUpperCase()} · ${outputSize} × ${outputSize}\n사진 보관함에 저장합니다.`,
      [
        { text: "취소", style: "cancel" },
        { text: "저장", onPress: () => void saveToLibrary() },
      ],
    );
  }

  async function saveToLibrary() {
    setStatus("saving");
    setMessage("");
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(
        true,
        outputFormat === "gif" ? ["photo"] : ["video"],
      );
      if (!permission.granted) {
        throw new Error("사진 보관함 저장 권한이 필요합니다.");
      }
      await MediaLibrary.saveToLibraryAsync(outputUri);
      setStatus("ready");
      setMessage("사진 보관함에 저장했습니다.");
    } catch (error) {
      setStatus("ready");
      setMessage(error instanceof Error ? error.message : "사진 보관함에 저장하지 못했습니다.");
    }
  }

  async function handleShare() {
    if (!outputUri) {
      return;
    }
    setStatus("sharing");
    setMessage("");
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("이 기기에서는 공유 기능을 사용할 수 없습니다.");
      }
      await Sharing.shareAsync(outputUri, {
        mimeType: outputFormat === "gif" ? "image/gif" : "video/mp4",
        UTI: outputFormat === "gif" ? "com.compuserve.gif" : "public.mpeg-4",
        dialogTitle: `${activeProject.title} 공유`,
      });
      setStatus("ready");
      setMessage("공유 화면을 닫았습니다. 영상은 앱 캐시에 계속 남아 있습니다.");
    } catch (error) {
      setStatus("ready");
      setMessage(error instanceof Error ? error.message : "영상을 공유하지 못했습니다.");
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <ScreenHeader
          title="영상 만들기"
          subtitle={`${outputSize} × ${outputSize} · ${outputFormat.toUpperCase()} · 로컬 처리`}
          onBack={() => goBackOrReplace(`/project/${activeProject.id}/preview`)}
          style={[styles.header, { width: contentWidth }]}
        />

        <View style={[styles.settingsCard, { width: contentWidth }]}>
          <Text selectable={false} style={styles.settingTitle}>
            파일 형식
          </Text>
          <View style={styles.optionRow}>
            {(["mp4", "gif"] as const).map((format) => (
              <Button
                key={format}
                title={format.toUpperCase()}
                variant={outputFormat === format ? "primary" : "secondary"}
                compact
                disabled={busy}
                accessibilityState={{ selected: outputFormat === format, disabled: busy }}
                onPress={() => handleFormatChange(format)}
                style={styles.optionButton}
              />
            ))}
          </View>

          <Text selectable={false} style={styles.settingTitle}>
            해상도
          </Text>
          <View style={styles.optionRow}>
            {OUTPUT_SIZES.map((size) => (
              <Button
                key={size}
                title={`${size} × ${size}`}
                variant={outputSize === size ? "primary" : "secondary"}
                compact
                disabled={busy}
                accessibilityState={{ selected: outputSize === size, disabled: busy }}
                onPress={() => handleSizeChange(size)}
                style={styles.optionButton}
              />
            ))}
          </View>
          <Text selectable style={styles.helperText}>
            높은 해상도와 많은 프레임은 특히 GIF의 생성 시간과 파일 크기를 크게 늘릴 수 있습니다.
          </Text>
        </View>

        <View style={[styles.settingsCard, { width: contentWidth }]}>
          <FpsInput value={fps} onChange={handleFpsChange} title="영상 재생 속도" disabled={busy} />
          <Text selectable style={styles.helperText}>
            모든 프레임을 현재 재생 속도로 기기 안에서 처리하며 서버로 보내지 않습니다.
          </Text>
        </View>

        <View style={[styles.progressCard, { width: contentWidth }]}>
          <MaskingTape corner="left" tone="success" />
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text selectable style={styles.statusText}>
            {status === "capturing"
              ? `프레임 준비 중 ${Math.round(progress * 100)}%`
              : status === "encoding"
                ? `${outputFormat.toUpperCase()} 인코딩 중 ${Math.round(progress * 100)}%`
                : status === "saving"
                  ? "사진 보관함에 저장 중"
                  : status === "sharing"
                    ? "공유 화면 여는 중"
                    : status === "ready"
                  ? "영상 준비 완료"
                  : "기기에서 영상을 만들 준비가 되었습니다."}
          </Text>
          {busy ? <ActivityIndicator color={theme.color.deepBlue} /> : null}
          {message ? (
            <Text selectable style={status === "error" ? styles.errorText : styles.messageText}>
              {message}
            </Text>
          ) : null}
        </View>

        {outputUri ? (
          <View style={[styles.actionRow, { width: contentWidth }]}>
            <Button title="기기에 저장" onPress={handleSave} disabled={busy} style={styles.actionButton} />
            <Button title="즉시 공유" variant="primary" onPress={handleShare} disabled={busy} style={styles.actionButton} />
          </View>
        ) : (
          <Button
            title={status === "error" ? "다시 만들기" : `${outputFormat.toUpperCase()} 만들기`}
            variant="primary"
            onPress={handleRender}
            disabled={busy}
            style={[styles.fullWidth, { width: contentWidth }]}
          />
        )}
      </ScrollView>

      <View
        ref={captureViewRef}
        collapsable={false}
        style={[styles.captureStage, { width: outputSize, height: outputSize }]}
      >
        <FrameComposite frame={captureFrame} size={outputSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.linen,
  },
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
    paddingTop: 24,
  },
  settingsCard: {
    gap: 10,
    padding: 20,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  settingTitle: {
    color: theme.color.graphite,
    fontSize: 13,
    fontWeight: "700",
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionButton: {
    flex: 1,
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
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
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
  messageText: {
    color: theme.color.green,
    fontSize: 12,
    lineHeight: 18,
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
  fullWidth: {
    alignSelf: "center",
  },
  captureStage: {
    position: "absolute",
    left: -10000,
    top: 0,
  },
});
