import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { theme } from "../theme";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
  rightAction?: ReactNode;
  compact?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export function ScreenHeader({ title, subtitle, onBack, backLabel = "뒤로", rightAction, compact = false, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.header, compact ? styles.headerCompact : null, style]}>
      <View style={[styles.headerRow, compact ? styles.headerRowCompact : null]}>
        <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={({ pressed }) => [styles.backButton, compact ? styles.backButtonCompact : null, pressed ? styles.pressed : null]}>
          <Text selectable={false} style={[styles.backIcon, compact ? styles.backIconCompact : null]}>
            {"<"}
          </Text>
        </Pressable>
        <View style={styles.titleGroup}>
          <Text selectable={false} style={[styles.title, compact ? styles.titleCompact : null]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text selectable style={[styles.subtitle, compact ? styles.subtitleCompact : null]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
    paddingTop: 4,
  },
  headerCompact: {
    paddingTop: 0,
  },
  headerRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerRowCompact: {
    minHeight: 44,
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonCompact: {
    width: 28,
    height: 28,
  },
  pressed: {
    opacity: 0.72,
  },
  backIcon: {
    color: theme.color.deepBlue,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
  },
  backIconCompact: {
    fontSize: 18,
    lineHeight: 20,
  },
  rightAction: {
    alignItems: "flex-end",
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.color.graphite,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "300",
  },
  titleCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  subtitle: {
    color: theme.color.muted,
    fontSize: 12,
  },
  subtitleCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
});
