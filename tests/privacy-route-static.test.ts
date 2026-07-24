import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("privacy policy route", () => {
  it("documents local media storage and the limited AI transfer", () => {
    const source = readFileSync(resolve("app/privacy+api.ts"), "utf8");

    equal(source.includes("기기에만 저장"), true);
    equal(source.includes("fal.ai"), true);
    equal(source.includes("Google AdMob"), true);
    equal(source.includes("로그인"), true);
    equal(source.includes("text/html"), true);
  });
});
