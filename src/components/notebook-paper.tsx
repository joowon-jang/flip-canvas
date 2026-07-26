import { StyleSheet, View, type ViewProps } from "react-native";

import { shadow } from "../shadow";
import { theme } from "../theme";

type TapeTone = "primary" | "success";

type NotebookPaperProps = ViewProps & {
  children?: React.ReactNode;
  /** Legacy notebook dog-ear. Paper Craft sheets are plain — default off. */
  fold?: boolean;
  // Decorative masking-tape accents pinned to the top corners of the sheet.
  tapeLeft?: TapeTone;
  tapeRight?: TapeTone;
};

export function MaskingTape({
  corner = "left",
  tone = "primary",
}: {
  corner?: "left" | "right";
  tone?: TapeTone;
}) {
  return (
    <View
      style={[
        styles.tape,
        corner === "left" ? styles.tapeLeft : styles.tapeRight,
        tone === "success" ? styles.tapeSuccess : styles.tapePrimary,
      ]}
    />
  );
}

export function NotebookPaper({ children, fold = false, tapeLeft, tapeRight, style, ...props }: NotebookPaperProps) {
  return (
    // The tape overhangs the top edge, so the sheet itself cannot clip.
    // An inner clipping view keeps strokes inside the paper.
    <View style={[styles.wrapper, style]}>
      <View {...props} style={styles.paper}>
        {children}
        {fold ? <View style={styles.fold} /> : null}
      </View>
      {tapeLeft ? <MaskingTape corner="left" tone={tapeLeft} /> : null}
      {tapeRight ? <MaskingTape corner="right" tone={tapeRight} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    aspectRatio: 1,
  },
  // The tape is absolutely positioned above the sheet and nothing clips it, so
  // no top margin is reserved for it. Reserving space here would silently cost
  // the no-scroll draw studio 10px: in landscape its canvas is height-bound
  // (`Math.min(availableHeight, widthBoundCanvas)`), so the sheet would overflow.
  paper: {
    flex: 1,
    overflow: "hidden",
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    // Design: paper sheets use the smallest radius — they read as cut paper,
    // not as rounded UI cards.
    borderRadius: theme.radius.xs,
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
  tape: {
    position: "absolute",
    top: -10,
    width: 74,
    height: 22,
    opacity: 0.5,
    pointerEvents: "none",
  },
  tapeLeft: {
    left: 28,
    transform: [{ rotate: "-4deg" }],
  },
  tapeRight: {
    right: 28,
    transform: [{ rotate: "3deg" }],
  },
  tapePrimary: {
    backgroundColor: theme.color.deepBlue,
  },
  tapeSuccess: {
    backgroundColor: theme.color.green,
  },
});
