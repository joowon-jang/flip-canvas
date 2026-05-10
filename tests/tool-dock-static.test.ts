import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { equal } from "node:assert/strict";
import { describe, it } from "./harness";

describe("tool dock layout contract", () => {
  it("keeps static tool dock styles in StyleSheet instead of inline style props", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("StyleSheet.create"), true);
    equal(source.includes("style={{"), false);
    equal(source.includes("contentContainerStyle={{"), false);
  });

  it("keeps horizontal controls in one scrollable row", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("ScrollView"), true);
    equal(source.includes("horizontal"), true);
    equal(source.includes("flexWrap"), false);
  });

  it("keeps vertical controls scrollable on short landscape screens", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("showsVerticalScrollIndicator={false}"), true);
    equal(source.includes('alignSelf: "stretch"'), true);
  });

  it("keeps the vertical tool dock width aligned with the landscape layout rail", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("railWidth?: number"), true);
    equal(source.includes("style={[styles.verticalDock, { width: railWidth, minWidth: railWidth, maxWidth: railWidth }]}"), true);
    equal(source.includes("panelFrame.x + railWidth + VERTICAL_PANEL_OFFSET"), true);
    equal(source.includes("flexGrow: 0"), true);
    equal(source.includes("flexShrink: 0"), true);
  });

  it("keeps the vertical root stretched while the inner scroll view fills available height", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("width: railWidth,"), true);
    equal(source.includes("verticalRoot: {\n    position: \"relative\",\n    zIndex: 20,\n    flexGrow: 0,\n    flexShrink: 0,\n    alignSelf: \"stretch\""), true);
    equal(source.includes("style={[styles.verticalDock, { width: railWidth, minWidth: railWidth, maxWidth: railWidth }]}"), true);
    equal(source.includes("style={[styles.verticalDock, { width: railWidth, minWidth: railWidth, maxWidth: railWidth, flexBasis: railWidth }]}"), false);
    equal(source.includes("verticalDock: {\n    flex: 1,\n    alignSelf: \"stretch\""), true);
  });

  it("uses a modal backdrop for open panels instead of expanding the landscape dock hit area", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("Modal"), true);
    equal(source.includes("transparent"), true);
    equal(source.includes("onRequestClose={closePanel}"), true);
    equal(source.includes("styles.panelBackdrop"), true);
    equal(source.includes("onPress={closePanel}"), true);
    equal(source.includes("VERTICAL_PANEL_WIDTH"), true);
    equal(source.includes("VERTICAL_PANEL_OFFSET"), true);
    equal(source.includes("verticalPanelHitWidth"), false);
    equal(source.includes("marginRight: -verticalPanelHitWidth"), false);
    equal(source.includes("style={[styles.verticalDock, { width: railWidth, minWidth: railWidth, maxWidth: railWidth }]}"), true);
  });

  it("uses contextual option panels instead of fixed swatch and size button groups", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("ToolOptionsPanel"), true);
    equal(source.includes("const colors ="), false);
    equal(source.includes("const sizes ="), false);
    equal(source.includes("ColorSwatchGroup"), false);
    equal(source.includes("SizeButtonGroup"), false);
  });

  it("exposes separate pen, eraser, and onion controls", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("penColor"), true);
    equal(source.includes("penSize"), true);
    equal(source.includes("eraserSize"), true);
    equal(source.includes("onionOpacityPercent"), true);
    equal(source.includes("onOnionOpacityPercentChange"), true);
  });

  it("separates selecting a tool from opening its settings panel", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("panel: ToolOptionsPanelKind"), true);
    equal(source.includes("panel?: undefined"), true);
    equal(source.includes("openPanel: (panel: ToolOptionsPanelKind) => void"), true);
    equal(source.includes("accessibilityLabel={`${item.label} 설정 열기`}"), true);
    equal(source.includes('onToolChange("pen");\n        togglePanel("pen");'), false);
    equal(source.includes('onToolChange("eraser");\n        togglePanel("eraser");'), false);
    equal(source.includes('label: "Onion",\n      accessibilityLabel: "어니언 스킨",\n      active: onionEnabled || activePanel === "onion",\n      onPress: () => togglePanel("onion"),'), false);
  });

  it("renders arrow disclosure buttons only for configurable tools", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("styles.disclosureButton"), true);
    equal(source.includes("styles.disclosureIcon"), true);
    equal(source.includes('item.panel ? ('), true);
    equal(source.includes("openPanel(item.panel)"), true);
    equal(source.includes("›"), true);
  });

  it("keeps vertical tool buttons large enough after adding disclosure controls", () => {
    const source = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("Math.max(52, Math.min(72, railWidth - 12))"), true);
    equal(source.includes("Math.max(56, Math.min(66"), true);
    equal(source.includes("padding: 6"), true);
    equal(source.includes("styles.toolButtonWithDisclosureVertical"), true);
    equal(source.includes("position: \"absolute\""), true);
    equal(source.includes("right: 4"), true);
    equal(source.includes("styles.toolButtonMainVertical"), false);
  });
});
