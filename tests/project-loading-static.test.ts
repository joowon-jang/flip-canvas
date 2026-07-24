import { equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

const projectScreens = [
  "app/project/[id]/preview.tsx",
  "app/project/[id]/render.tsx",
  "app/project/[id]/frames.tsx",
];

describe("project loading state contract", () => {
  it("uses a shared project loading state instead of returning null while loading", () => {
    for (const path of projectScreens) {
      const source = readFileSync(resolve(path), "utf8");

      ok(source.includes("ProjectLoadState"), path);
      ok(source.includes("ready"), path);
      equal(source.includes("if (!project) {\n    return null;\n  }"), false, path);
    }
  });
});
