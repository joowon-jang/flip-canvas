export const theme = {
  color: {
    linen: "#EEE7DB",
    paper: "#FCF8EF",
    paperSoft: "#F6F0E6",
    ruled: "#DDE3E5",
    progressTrack: "#F2EADB",
    graphite: "#171717",
    graphiteSoft: "#3B3833",
    muted: "#7A7167",
    hairline: "#D8D0C0",
    deepBlue: "#143D59",
    vermilion: "#B9483C",
    green: "#4E7E62",
    shadow: "rgba(23, 23, 23, 0.08)",
    overlay: "rgba(252, 248, 239, 0.72)",
    scrim: "rgba(23, 23, 23, 0.28)",
    white: "#FFFFFF",
  },
  radius: {
    xs: 5,
    sm: 6,
    md: 8,
    lg: 16,
    xl: 28,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  font: {
    regular: "System",
  },
} as const;

export const shadow = {
  boxShadow: "0 1px 2px rgba(23, 23, 23, 0.06)",
} as const;
