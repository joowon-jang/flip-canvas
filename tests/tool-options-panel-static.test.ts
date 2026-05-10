import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("tool options panel contract", () => {
  it("shows centered brush previews for both pen and eraser without preview copy", () => {
    const source = readFileSync(resolve("src/components/tool-options-panel.tsx"), "utf8");

    equal(source.includes("function BrushSizePreview"), true);
    equal(source.includes("size={penSize}"), true);
    equal(source.includes("size={eraserSize}"), true);
    equal(source.includes("previewLabel"), false);
    equal(source.includes("미리보기"), false);
    equal(source.includes("previewBox"), true);
    equal(source.includes('alignItems: "center"'), true);
    equal(source.includes('justifyContent: "center"'), true);
  });

  it("captures panel touches so drawing input behind the panel does not receive them", () => {
    const source = readFileSync(resolve("src/components/tool-options-panel.tsx"), "utf8");
    const dockSource = readFileSync(resolve("src/components/tool-dock.tsx"), "utf8");

    equal(source.includes("onStartShouldSetResponder={() => true}"), true);
    equal(dockSource.includes("Modal"), true);
    equal(dockSource.includes("styles.panelBackdrop"), true);
    equal(dockSource.includes("onPress={closePanel}"), true);
    equal(dockSource.includes("marginRight: -verticalPanelHitWidth"), false);
  });
});
