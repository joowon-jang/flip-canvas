import { equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

const projectScreens = [
  "app/project/new/index.tsx",
  "app/project/[id]/draw.tsx",
  "app/project/[id]/frames.tsx",
  "app/project/[id]/preview.tsx",
  "app/project/[id]/render.tsx",
  "app/project/[id]/share.tsx",
  "app/v/[shareId]/index.tsx",
];

describe("mobile convenience UI", () => {
  it("uses an internal screen header with explicit fallback navigation", () => {
    const headerSource = readFileSync(resolve("src/components/screen-header.tsx"), "utf8");
    const navigationSource = readFileSync(resolve("src/navigation/go-back.ts"), "utf8");

    ok(headerSource.includes("ScreenHeader"));
    ok(headerSource.includes("backLabel"));
    ok(navigationSource.includes("goBackOrReplace"));
    ok(navigationSource.includes("router.canGoBack()"));

    for (const path of projectScreens) {
      const source = readFileSync(resolve(path), "utf8");

      ok(source.includes("ScreenHeader"), path);
      ok(source.includes("goBackOrReplace"), path);
    }
  });

  it("keeps the back control icon-only and places titles beside it", () => {
    const headerSource = readFileSync(resolve("src/components/screen-header.tsx"), "utf8");

    ok(headerSource.includes("styles.headerRow"));
    ok(headerSource.includes("styles.titleGroup"));
    ok(headerSource.includes("accessibilityLabel={backLabel}"));
    equal(headerSource.includes("styles.topRow"), false);
    equal(headerSource.includes("styles.backLabel"), false);
  });

  it("adds project management actions to library cards", () => {
    const source = readFileSync(resolve("app/index.tsx"), "utf8");

    ok(source.includes("관리"));
    ok(source.includes("Modal"));
    ok(source.includes("renameProject"));
    ok(source.includes("duplicateProject"));
    ok(source.includes("deleteProject"));
    ok(source.includes("Alert.alert"));
  });

  it("copies share links through expo clipboard with visible feedback", () => {
    const packageJson = readFileSync(resolve("package.json"), "utf8");
    const source = readFileSync(resolve("app/project/[id]/share.tsx"), "utf8");

    ok(packageJson.includes("expo-clipboard"));
    ok(source.includes("expo-clipboard"));
    ok(source.includes("링크 복사"));
    ok(source.includes("복사됨"));
  });

  it("keeps the native stack header disabled", () => {
    const source = readFileSync(resolve("app/_layout.tsx"), "utf8");

    equal(source.includes("headerShown: false"), true);
  });
});
