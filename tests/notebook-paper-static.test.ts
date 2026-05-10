import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("notebook paper background contract", () => {
  it("keeps drawing paper plain so eraser strokes cannot remove guide patterns", () => {
    const source = readFileSync(resolve("src/components/notebook-paper.tsx"), "utf8");

    equal(source.includes("marginLine"), false);
    equal(source.includes("ruleLine"), false);
    equal(source.includes("theme.color.ruled"), false);
  });
});
