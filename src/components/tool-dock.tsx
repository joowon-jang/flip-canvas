import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { shadow, shadowStrong } from "../shadow";
import { theme } from "../theme";
import { ToolOptionsPanel, type ToolOptionsPanelKind } from "./tool-options-panel";

export type DrawingTool = "pen" | "eraser";

type ToolDockProps = {
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
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
  onUndo: () => void;
  onRedo: () => void;
  vertical?: boolean;
  railWidth?: number;
};

const DEFAULT_VERTICAL_RAIL_WIDTH = 76;
const VERTICAL_PANEL_WIDTH = 292;
const VERTICAL_PANEL_OFFSET = 10;

type BaseToolItem = {
  label: string;
  accessibilityLabel: string;
  active: boolean;
  onPress: () => void;
};

type ToolItem = BaseToolItem & ({ panel: ToolOptionsPanelKind } | { panel?: undefined });

type ToolButtonProps = {
  item: ToolItem;
  vertical: boolean;
  verticalButtonWidth: number;
  verticalButtonHeight: number;
  activePanel: ToolOptionsPanelKind | null;
  openPanel: (panel: ToolOptionsPanelKind) => void;
};

type DockFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function ToolButton({
  item,
  vertical,
  verticalButtonWidth,
  verticalButtonHeight,
  activePanel,
  openPanel,
}: ToolButtonProps) {
  const panelOpen = item.panel === activePanel;

  return (
    <View
      style={[
        styles.toolButtonGroup,
        vertical
          ? [styles.toolButtonGroupVertical, { width: verticalButtonWidth, height: verticalButtonHeight }]
          : styles.toolButtonGroupHorizontal,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.accessibilityLabel}
        accessibilityState={item.active ? { selected: true } : undefined}
        onPress={item.onPress}
        style={({ pressed }) => [
          styles.toolButton,
          vertical
            ? [
                styles.toolButtonVertical,
                { width: verticalButtonWidth, height: verticalButtonHeight },
                item.panel ? styles.toolButtonWithDisclosureVertical : null,
              ]
            : styles.toolButtonHorizontal,
          item.active ? styles.toolButtonActive : styles.toolButtonInactive,
          pressed && styles.pressed,
        ]}
      >
        <Text
          selectable={false}
          style={[
            styles.toolLabel,
            vertical ? styles.toolLabelVertical : styles.toolLabelHorizontal,
            item.active ? styles.toolLabelActive : styles.toolLabelInactive,
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
      {item.panel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.label} 설정 열기`}
          accessibilityState={{ expanded: panelOpen }}
          onPress={() => openPanel(item.panel)}
          style={({ pressed }) => [
            styles.disclosureButton,
            vertical ? styles.disclosureButtonVertical : styles.disclosureButtonHorizontal,
            panelOpen ? styles.disclosureButtonActive : styles.disclosureButtonInactive,
            pressed && styles.pressed,
          ]}
        >
          <Text
            selectable={false}
            style={[
              styles.disclosureIcon,
              vertical ? styles.disclosureIconVertical : styles.disclosureIconHorizontal,
              panelOpen ? styles.disclosureIconActive : styles.disclosureIconInactive,
            ]}
          >
            ›
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ToolDock({
  tool,
  onToolChange,
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
  onUndo,
  onRedo,
  vertical = false,
  railWidth = DEFAULT_VERTICAL_RAIL_WIDTH,
}: ToolDockProps) {
  const rootRef = useRef<View>(null);
  const [activePanel, setActivePanel] = useState<ToolOptionsPanelKind | null>(null);
  const [dockFrame, setDockFrame] = useState<DockFrame | null>(null);
  const viewport = useWindowDimensions();
  const verticalButtonWidth = Math.max(52, Math.min(72, railWidth - 12));
  const verticalButtonHeight = Math.max(56, Math.min(66, Math.round(verticalButtonWidth * 1.08)));

  const measureDock = useCallback((nextPanel?: ToolOptionsPanelKind) => {
    const node = rootRef.current;
    if (!node) {
      if (nextPanel) {
        setActivePanel(nextPanel);
      }
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      setDockFrame({ x, y, width, height });
      if (nextPanel) {
        setActivePanel(nextPanel);
      }
    });
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  function openPanel(panel: ToolOptionsPanelKind) {
    if (activePanel === panel) {
      closePanel();
      return;
    }
    measureDock(panel);
  }

  useEffect(() => {
    if (activePanel) {
      measureDock();
    }
  }, [activePanel, measureDock, viewport.height, viewport.width]);

  const items = [
    {
      label: "Pen",
      accessibilityLabel: "펜 도구",
      active: tool === "pen",
      onPress: () => onToolChange("pen"),
      panel: "pen" as const,
    },
    {
      label: "Erase",
      accessibilityLabel: "지우개 도구",
      active: tool === "eraser",
      onPress: () => onToolChange("eraser"),
      panel: "eraser" as const,
    },
    {
      label: "Onion",
      accessibilityLabel: "어니언 스킨",
      active: onionEnabled,
      onPress: onToggleOnion,
      panel: "onion" as const,
    },
    {
      label: "Undo",
      accessibilityLabel: "실행 취소",
      active: false,
      onPress: () => {
        setActivePanel(null);
        onUndo();
      },
    },
    {
      label: "Redo",
      accessibilityLabel: "다시 실행",
      active: false,
      onPress: () => {
        setActivePanel(null);
        onRedo();
      },
    },
  ];

  const controls = (
    <>
      {items.map((item) => (
        <ToolButton
          key={item.label}
          item={item}
          vertical={vertical}
          verticalButtonWidth={verticalButtonWidth}
          verticalButtonHeight={verticalButtonHeight}
          activePanel={activePanel}
          openPanel={openPanel}
        />
      ))}
    </>
  );
  const panelFrame = dockFrame ?? { x: 8, y: viewport.height - 80, width: viewport.width - 16, height: 64 };
  const modalPanelWidth = vertical
    ? Math.min(VERTICAL_PANEL_WIDTH, Math.max(220, viewport.width - 16))
    : Math.min(Math.max(panelFrame.width, 220), viewport.width - 16);
  const modalPanelLeft = vertical
    ? Math.max(8, Math.min(panelFrame.x + railWidth + VERTICAL_PANEL_OFFSET, viewport.width - modalPanelWidth - 8))
    : Math.max(8, Math.min(panelFrame.x, viewport.width - modalPanelWidth - 8));
  const modalPanelTop = Math.max(8, Math.min(panelFrame.y, viewport.height - 160));
  const modalPanelBottom = Math.max(8, viewport.height - panelFrame.y + 10);
  const modalPanelMaxHeight = vertical
    ? Math.max(160, viewport.height - modalPanelTop - 8)
    : Math.max(160, panelFrame.y - 18);
  const optionsPanel = activePanel ? (
    <Modal visible transparent animationType="none" onRequestClose={closePanel}>
      <View style={styles.panelLayer}>
        <Pressable accessibilityRole="button" accessibilityLabel="도구 설정 닫기" onPress={closePanel} style={styles.panelBackdrop} />
        <ToolOptionsPanel
          panel={activePanel}
          penColor={penColor}
          onPenColorChange={onPenColorChange}
          penSize={penSize}
          onPenSizeChange={onPenSizeChange}
          eraserSize={eraserSize}
          onEraserSizeChange={onEraserSizeChange}
          onionEnabled={onionEnabled}
          onToggleOnion={onToggleOnion}
          onionOpacityPercent={onionOpacityPercent}
          onOnionOpacityPercentChange={onOnionOpacityPercentChange}
          style={
            vertical
              ? [styles.optionsPanel, { left: modalPanelLeft, top: modalPanelTop, width: modalPanelWidth, maxHeight: modalPanelMaxHeight }]
              : [styles.optionsPanel, { left: modalPanelLeft, width: modalPanelWidth, bottom: modalPanelBottom, maxHeight: modalPanelMaxHeight }]
          }
        />
      </View>
    </Modal>
  ) : null;

  if (!vertical) {
    return (
      <View ref={rootRef} onLayout={() => measureDock()} style={styles.horizontalRoot}>
        {optionsPanel}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalContent}
          style={styles.horizontalDock}
        >
          {controls}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      ref={rootRef}
      onLayout={() => measureDock()}
      style={[
        styles.verticalRoot,
        {
          width: railWidth,
          minWidth: railWidth,
          maxWidth: railWidth,
          flexBasis: railWidth,
        },
      ]}
    >
      {optionsPanel}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.verticalContent}
        style={[styles.verticalDock, { width: railWidth, minWidth: railWidth, maxWidth: railWidth }]}
      >
        {controls}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalRoot: {
    position: "relative",
    zIndex: 20,
  },
  horizontalDock: {
    maxHeight: 64,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  horizontalContent: {
    flexDirection: "row",
    gap: 10,
    padding: 13,
    alignItems: "center",
  },
  verticalRoot: {
    position: "relative",
    zIndex: 20,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "stretch",
  },
  verticalDock: {
    flex: 1,
    alignSelf: "stretch",
    borderRadius: theme.radius.md,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    ...shadow,
  },
  verticalContent: {
    flexDirection: "column",
    gap: 10,
    padding: 6,
    alignItems: "center",
  },
  panelLayer: {
    flex: 1,
  },
  panelBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "transparent",
  },
  optionsPanel: {
    position: "absolute",
    zIndex: 30,
    ...shadowStrong,
  },
  toolButtonGroup: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 4,
  },
  toolButtonGroupHorizontal: {
    height: 44,
  },
  toolButtonGroupVertical: {
    position: "relative",
    height: 56,
  },
  toolButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    borderColor: theme.color.hairline,
  },
  toolButtonHorizontal: {
    width: 72,
    height: 44,
  },
  toolButtonVertical: {
    minWidth: 0,
  },
  toolButtonWithDisclosureVertical: {
    paddingRight: 20,
  },
  toolButtonActive: {
    borderWidth: 0,
    backgroundColor: theme.color.graphite,
  },
  toolButtonInactive: {
    borderWidth: theme.border.hairline,
    backgroundColor: theme.color.paperSoft,
  },
  pressed: {
    opacity: 0.72,
  },
  toolLabel: {
    fontFamily: theme.font.displayBold,
  },
  toolLabelHorizontal: {
    fontSize: 15,
  },
  toolLabelVertical: {
    fontSize: 13,
  },
  toolLabelActive: {
    color: theme.color.paper,
  },
  toolLabelInactive: {
    color: theme.color.muted,
  },
  disclosureButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.hairline,
  },
  disclosureButtonHorizontal: {
    width: 32,
  },
  disclosureButtonVertical: {
    position: "absolute",
    right: 4,
    top: 4,
    bottom: 4,
    width: 20,
    zIndex: 2,
  },
  disclosureButtonActive: {
    backgroundColor: theme.color.graphite,
    borderColor: theme.color.graphite,
  },
  disclosureButtonInactive: {
    backgroundColor: theme.color.paperSoft,
  },
  disclosureIcon: {
    fontWeight: "800",
  },
  disclosureIconHorizontal: {
    fontSize: 18,
  },
  disclosureIconVertical: {
    fontSize: 14,
  },
  disclosureIconActive: {
    color: theme.color.paper,
  },
  disclosureIconInactive: {
    color: theme.color.deepBlue,
  },
});
