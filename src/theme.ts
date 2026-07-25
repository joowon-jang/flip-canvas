// Flip Canvas — "Paper Craft" theme.
// Kraft-paper base, ink-brown text, terracotta primary, hard offset shadows.
// Token *keys* are kept stable so existing screens keep resolving; only values changed.

export const theme = {
  color: {
    linen: "#E3CFA9", // app background — kraft paper
    paper: "#FBF6EA", // cards, canvas, thumbnails — cream paper
    paperSoft: "#FFFDF6", // inputs, inactive thumbs, tool-button fill
    ruled: "#EFE5CF", // guide lines inside shared SVG output
    progressTrack: "#EFE5CF", // progress / slider track
    graphite: "#4A3B2A", // primary text and default pen — ink brown
    graphiteSoft: "#6E5A3E", // secondary text
    muted: "#B0A184", // meta / muted labels
    hairline: "#D9C69C", // 1.5px borders on paper, inputs, thumbs
    deepBlue: "#C0563B", // PRIMARY action / selected state — terracotta
    vermilion: "#B9483C", // destructive, error, drag target only
    green: "#6E8A60", // success feedback (copied, etc.)
    shadow: "rgba(74, 59, 42, 0.2)",
    overlay: "rgba(251, 246, 234, 0.72)",
    scrim: "rgba(74, 59, 42, 0.32)",
    white: "#FFFFFF",
  },
  radius: {
    xs: 3, // paper sheets, thumbnails
    sm: 5, // buttons, inputs
    md: 8, // cards, panels, players
    lg: 14, // outer app shell
    xl: 24, // reserved
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  border: {
    hairline: 1.5, // Paper Craft uses a slightly heavier hairline than 1px
  },
  font: {
    regular: "System", // body / meta — Noto Sans KR / system
    display: "Gaegu", // Gaegu 400 — handwritten (load via expo-font)
    displayBold: "Gaegu-Bold", // Gaegu 700 — ALL display type in the design is 700
  },
} as const;
