import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { frameDurationMs } from "../model/fps";
import { shadow, theme } from "../theme";
import type { ShareManifest } from "../types/flipbook";

type FlipPlayerProps = {
  manifest: ShareManifest;
  size: number;
  autoPlay?: boolean;
};

export function FlipPlayer({ manifest, size, autoPlay = true }: FlipPlayerProps) {
  const [index, setIndex] = useState(0);
  const frame = manifest.frames[index] ?? manifest.frames[0];
  const frameDuration = frameDurationMs(manifest.fps);

  useEffect(() => {
    if (!autoPlay || manifest.frames.length < 2) {
      return;
    }

    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % manifest.frames.length);
    }, frameDuration);

    return () => clearInterval(interval);
  }, [autoPlay, frameDuration, manifest.frames.length]);

  if (!frame) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text selectable style={styles.emptyText}>
          재생할 프레임이 없습니다.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.player, { width: size, height: size }]}
    >
      <Image source={{ uri: frame.url }} contentFit="cover" cachePolicy="memory-disk" style={[styles.frameImage, { width: size, height: size }]} />
      <Text
        selectable={false}
        style={styles.counter}
      >
        {String(index + 1).padStart(3, "0")} / {String(manifest.frameCount).padStart(3, "0")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: theme.color.muted,
  },
  player: {
    overflow: "hidden",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  frameImage: {
    backgroundColor: theme.color.paper,
  },
  counter: {
    position: "absolute",
    right: 12,
    top: 10,
    color: theme.color.muted,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
});
