import { StyleSheet, View, type ViewProps } from "react-native";

import { shadow, theme } from "../theme";

type NotebookPaperProps = ViewProps & {
  children?: React.ReactNode;
  fold?: boolean;
};

export function NotebookPaper({ children, fold = true, style, ...props }: NotebookPaperProps) {
  return (
    <View
      {...props}
      style={[
        styles.paper,
        style,
      ]}
    >
      {children}
      {fold ? (
        <View

          style={styles.fold}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    aspectRatio: 1,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.color.hairline,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  fold: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: "16%",
    height: "16%",
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paperSoft,
    transform: [{ skewX: "-28deg" }],
    opacity: 0.9,
  },
});
