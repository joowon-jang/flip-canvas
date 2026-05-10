import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { FPS_MAX, FPS_MIN, normalizeFps, parseFpsText } from "../model/fps";
import { theme } from "../theme";
import type { FlipProject } from "../types/flipbook";

export type FpsValue = FlipProject["fps"];

type FpsInputProps = {
  value: FpsValue;
  onChange: (value: FpsValue) => void;
  title?: string;
  disabled?: boolean;
};

export function FpsInput({ value, onChange, title = "재생 속도", disabled = false }: FpsInputProps) {
  const normalizedValue = normalizeFps(value);
  const [text, setText] = useState(String(normalizedValue));

  useEffect(() => {
    setText(String(normalizedValue));
  }, [normalizedValue]);

  function commit(rawText = text) {
    const nextValue = parseFpsText(rawText, normalizedValue);
    setText(String(nextValue));
    if (nextValue !== normalizedValue) {
      onChange(nextValue);
    }
  }

  function step(delta: number) {
    const nextValue = normalizeFps(normalizedValue + delta, normalizedValue);
    setText(String(nextValue));
    onChange(nextValue);
  }

  return (
    <View style={[styles.root, disabled ? styles.rootDisabled : null]}>
      <View style={styles.header}>
        <Text selectable={false} style={styles.title}>
          {title}
        </Text>
        <Text selectable={false} style={styles.range}>
          {FPS_MIN}-{FPS_MAX} fps
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="FPS 줄이기"
          disabled={disabled || normalizedValue <= FPS_MIN}
          onPress={() => step(-1)}
          style={({ pressed }) => [
            styles.stepButton,
            disabled || normalizedValue <= FPS_MIN ? styles.stepButtonDisabled : pressed ? styles.stepButtonPressed : null,
          ]}
        >
          <Text selectable={false} style={styles.stepLabel}>
            -
          </Text>
        </Pressable>

        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            editable={!disabled}
            keyboardType="number-pad"
            inputMode="numeric"
            onChangeText={(nextText) => setText(nextText.replace(/[^0-9]/g, "").slice(0, 2))}
            onBlur={() => commit()}
            onEndEditing={() => commit()}
            style={styles.input}
          />
          <Text selectable={false} style={styles.unit}>
            fps
          </Text>
        </View>

        <Pressable
          accessibilityLabel="FPS 늘리기"
          disabled={disabled || normalizedValue >= FPS_MAX}
          onPress={() => step(1)}
          style={({ pressed }) => [
            styles.stepButton,
            disabled || normalizedValue >= FPS_MAX ? styles.stepButtonDisabled : pressed ? styles.stepButtonPressed : null,
          ]}
        >
          <Text selectable={false} style={styles.stepLabel}>
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  rootDisabled: {
    opacity: 0.56,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: theme.color.graphite,
    fontSize: 13,
    fontWeight: "700",
  },
  range: {
    color: theme.color.muted,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  controls: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  stepButton: {
    width: 44,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paperSoft,
  },
  stepButtonPressed: {
    opacity: 0.72,
  },
  stepButtonDisabled: {
    opacity: 0.48,
  },
  stepLabel: {
    color: theme.color.graphite,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "500",
  },
  inputWrap: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paperSoft,
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: theme.color.graphite,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  unit: {
    color: theme.color.muted,
    fontSize: 13,
    fontWeight: "700",
  },
});
