import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

import { shadow, shadowStrong } from "../shadow";
import { theme } from "../theme";

type ButtonProps = PressableProps & {
  title: string;
  variant?: "primary" | "secondary" | "dark";
  compact?: boolean;
};

export function Button({ title, variant = "secondary", compact = false, style, ...props }: ButtonProps) {
  const isPrimary = variant === "primary";
  const isDark = variant === "dark";
  const disabled = Boolean(props.disabled);
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled, ...props.accessibilityState }}
      style={(state) => {
        const { pressed } = state;
        return StyleSheet.flatten([
          styles.button,
          compact ? styles.buttonCompact : styles.buttonRegular,
          isPrimary ? styles.buttonPrimary : isDark ? styles.buttonDark : styles.buttonSecondary,
          pressed && !disabled ? styles.buttonPressed : null,
          disabled ? styles.buttonDisabled : null,
          typeof style === "function" ? style(state) : style,
        ]);
      }}
    >
      <Text
        selectable={false}
        style={[
          styles.label,
          compact ? styles.labelCompact : styles.labelRegular,
          isPrimary || isDark ? styles.labelOnDark : styles.labelSecondary,
          disabled ? styles.labelDisabled : null,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    borderColor: theme.color.hairline,
  },
  buttonRegular: {
    minHeight: 46,
    paddingHorizontal: 18,
  },
  buttonCompact: {
    minHeight: 34,
    paddingHorizontal: 14,
  },
  buttonPrimary: {
    borderWidth: 0,
    backgroundColor: theme.color.deepBlue,
    // Primary sits highest in the paper stack.
    ...shadowStrong,
  },
  buttonSecondary: {
    borderWidth: theme.border.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  buttonDark: {
    borderWidth: 0,
    backgroundColor: theme.color.graphite,
    ...shadowStrong,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    // Design: every button label is handwritten 700.
    fontFamily: theme.font.displayBold,
  },
  labelRegular: {
    fontSize: 17,
    lineHeight: 22,
  },
  labelCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  labelOnDark: {
    color: theme.color.white,
  },
  labelSecondary: {
    // Design: secondary labels are INK, not terracotta.
    // Terracotta is reserved for the single primary action per screen.
    color: theme.color.graphite,
  },
  labelDisabled: {
    color: theme.color.muted,
  },
});
