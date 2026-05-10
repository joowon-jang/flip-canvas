import { deepEqual, equal } from "node:assert/strict";

import { createSessionHistory, recordStroke, redoFrameStroke, undoFrameStroke } from "../src/model/session-history";
import type { Stroke } from "../src/types/flipbook";
import { describe, it } from "./harness";

function stroke(id: string): Stroke {
  return {
    id,
    tool: "pen",
    color: "#171717",
    baseWidth: 4,
    createdAt: 1,
    points: [{ x: 0, y: 0, timestamp: 1, pressure: 0.5, pointerType: "touch", phase: "begin" }],
  };
}

describe("session stroke history", () => {
  it("undoes only strokes recorded for the current frame in this app session", () => {
    const persisted = stroke("persisted");
    const sessionStroke = stroke("session");
    const history = recordStroke(createSessionHistory(), "f1", sessionStroke);

    const result = undoFrameStroke(history, "f1", [persisted, sessionStroke]);

    deepEqual(result.strokes.map((item) => item.id), ["persisted"]);
    equal(result.entry?.stroke.id, "session");
  });

  it("keeps redo entries scoped to their frame", () => {
    const sessionStroke = stroke("session");
    const undone = undoFrameStroke(recordStroke(createSessionHistory(), "f1", sessionStroke), "f1", [sessionStroke]);
    const missed = redoFrameStroke(undone.history, "f2");
    const redone = redoFrameStroke(undone.history, "f1");

    equal(missed.entry, undefined);
    equal(redone.entry?.stroke.id, "session");
  });
});
