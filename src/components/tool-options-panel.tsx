import { StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { ColorPicker } from "./color-picker";
import { ValueSlider } from "./value-slider";
import { theme } from "../theme";

export type ToolOptionsPanelKind = "pen" | "eraser" | "onion";

type ToolOptionsPanelProps = {
  panel: ToolOptionsPanelKind;
  penColor: string;
  onPenColorChange: (color: string) => void;
  penSize: number;
  onPenSizeChange: (size: number) => void;
  eraserSize: number;
  onEraserSizeChange: (size: number) => void;
  onionEnabled: boolean;
  onToggleOnion: () => void;
  onionOpacityPercent: number;
  onOnionOpacityPercentChange: (opacity: number) => void;
  style?: StyleProp<ViewStyle>;
};

type BrushSizePreviewProps = {
  size: number;
  color: string;
  borderColor?: string;
};

const PREVIEW_BOX_SIZE = 56;

function BrushSizePreview({ size, color, borderColor = color }: BrushSizePreviewProps) {
  return (
    <View style={styles.previewBox}>
      <View
        style={[
          styles.previewDot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            borderColor,
          },
        ]}
      />
    </View>
  );
}

export function ToolOptionsPanel({
  panel,
  penColor,
  onPenColorChange,
  penSize,
  onPenSizeChange,
  eraserSize,
  onEraserSizeChange,
  onionEnabled,
  onToggleOnion,
  onionOpacityPercent,
  onOnionOpacityPercentChange,
  style,
}: ToolOptionsPanelProps) {
  return (
    <View onStartShouldSetResponder={() => true} style={[styles.panel, style]}>
      {panel === "pen" ? (
        <View style={styles.section}>
          <Text selectable={false} style={styles.title}>
            Pen
          </Text>
          <ValueSlider
            label="굵기"
            value={penSize}
            min={1}
            max={24}
            step={1}
            onValueChange={onPenSizeChange}
            formatValue={(value) => `${value}px`}
            fillColor={theme.color.graphite}
          />
          <BrushSizePreview size={penSize} color={penColor} />
          <ColorPicker color={penColor} onColorChange={onPenColorChange} />
        </View>
      ) : null}
      {panel === "eraser" ? (
        <View style={styles.section}>
          <Text selectable={false} style={styles.title}>
            Erase
          </Text>
          <ValueSlider
            label="지우개 굵기"
            value={eraserSize}
            min={4}
            max={48}
            step={1}
            onValueChange={onEraserSizeChange}
            formatValue={(value) => `${value}px`}
            fillColor={theme.color.vermilion}
          />
          <BrushSizePreview size={eraserSize} color={theme.color.paperSoft} borderColor={theme.color.hairline} />
        </View>
      ) : null}
      {panel === "onion" ? (
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text selectable={false} style={styles.title}>
                Onion
              </Text>
              <Text selectable={false} style={styles.caption}>
                이전 프레임 표시
              </Text>
            </View>
            <Switch
              accessibilityLabel="어니언 스킨 켜기"
              value={onionEnabled}
              onValueChange={onToggleOnion}
              trackColor={{ false: theme.color.hairline, true: theme.color.deepBlue }}
              thumbColor={theme.color.paper}
            />
          </View>
          <ValueSlider
            label="투명도"
            value={onionOpacityPercent}
            min={0}
            max={100}
            step={1}
            onValueChange={onOnionOpacityPercentChange}
            formatValue={(value) => `${value}%`}
            fillColor={theme.color.deepBlue}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: theme.radius.md,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    padding: 14,
    gap: 12,
  },
  section: {
    gap: 12,
  },
  title: {
    color: theme.color.graphite,
    fontFamily: theme.font.displayBold,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchTextGroup: {
    flex: 1,
    gap: 2,
  },
  caption: {
    color: theme.color.muted,
    fontSize: 11,
  },
  previewBox: {
    width: PREVIEW_BOX_SIZE,
    height: PREVIEW_BOX_SIZE,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderRadius: theme.radius.sm,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paperSoft,
  },
  previewDot: {
    borderWidth: 1,
  },
});
