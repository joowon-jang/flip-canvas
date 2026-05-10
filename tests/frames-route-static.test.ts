import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("frames route management contract", () => {
  it("manages the selected frame instead of hardcoding the first frame", () => {
    const source = readFileSync(resolve("app/project/[id]/frames.tsx"), "utf8");

    equal(source.includes("selectedFrameId"), true);
    equal(source.includes("onSelect={setSelectedFrameId}"), true);
    equal(source.includes("selectedFrame.id"), true);
    equal(source.includes("첫 프레임"), false);
  });

  it("offers selected-frame actions with confirm and drag reorder", () => {
    const source = readFileSync(resolve("app/project/[id]/frames.tsx"), "utf8");

    equal(source.includes("function handleDuplicateFrame(frameId: string)"), true);
    equal(source.includes("function handleRemoveFrame(frameId: string)"), true);
    equal(source.includes("function handleMoveFrameToIndex(frameId: string, toIndex: number)"), true);
    equal(source.includes("onMoveFrame={handleMoveFrameToIndex}"), true);
    equal(source.includes("Alert.alert"), true);
    equal(source.includes("onDuplicateFrame={handleDuplicateFrame}"), false);
    equal(source.includes("onRemoveFrame={handleRemoveFrame}"), false);
  });
});
