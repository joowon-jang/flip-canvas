import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("draw redo frame ownership", () => {
  it("keeps redo entries tied to their original frame", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");
    const sessionSource = readFileSync(resolve("src/drawing/use-draw-session.ts"), "utf8");
    const historySource = readFileSync(resolve("src/model/session-history.ts"), "utf8");

    equal(source.includes("useDrawSession"), true);
    equal(sessionSource.includes("redoFrameStroke(historyRef.current, frame.id)"), true);
    equal(historySource.includes("frameId: string"), true);
    equal(historySource.includes("item.frameId === frameId"), true);
  });

  it("keeps undo limited to strokes drawn during the current app session", () => {
    const source = readFileSync(resolve("app/project/[id]/draw.tsx"), "utf8");
    const sessionSource = readFileSync(resolve("src/drawing/use-draw-session.ts"), "utf8");
    const historySource = readFileSync(resolve("src/model/session-history.ts"), "utf8");

    equal(sessionSource.includes("historyRef.current = createSessionHistory()"), true);
    equal(historySource.includes("undoStack: []"), true);
    equal(source.includes("activeFrame.strokes[activeFrame.strokes.length - 1]"), false);
  });
});
