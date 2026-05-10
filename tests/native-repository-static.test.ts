import { equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("native project repository transaction contract", () => {
  it("wraps frame and project writes in exclusive SQLite transactions", () => {
    const source = readFileSync(resolve("src/storage/project-repository.ts"), "utf8");

    ok(source.includes("withExclusiveTransactionAsync"));
    ok(source.includes("writeProjectMetadata"));
    ok(source.includes("writeFrameRecords"));
    equal(source.includes("for (const frame of sanitized.frames) {\n    await saveFrame"), false);
  });

  it("builds summary previews from the first stored frame instead of assuming index zero exists", () => {
    const source = readFileSync(resolve("src/storage/project-repository.ts"), "utf8");

    ok(source.includes("firstPreviewFrameByProjectId"));
    ok(source.includes("ORDER BY project_id ASC, frame_index ASC"));
    equal(source.includes("WHERE frame_index = 0"), false);
  });

  it("deletes projects, frames, and strokes in one exclusive transaction", () => {
    const source = readFileSync(resolve("src/storage/project-repository.ts"), "utf8");

    ok(source.includes("export async function deleteProject"));
    ok(source.includes("DELETE FROM strokes WHERE frame_id IN (SELECT id FROM frames WHERE project_id = ?)"));
    ok(source.includes("DELETE FROM frames WHERE project_id = ?"));
    ok(source.includes("DELETE FROM projects WHERE id = ?"));
  });
});
