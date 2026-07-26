import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("preview route", () => {
  it("keeps preview actions focused on making the video", () => {
    const source = readFileSync(resolve("app/project/[id]/preview.tsx"), "utf8");

    equal(source.includes("계속 그리기"), false);
    equal(source.includes("영상 만들기"), true);
  });

  it("uses local stroke rendering instead of data image SVGs", () => {
    const source = readFileSync(resolve("app/project/[id]/preview.tsx"), "utf8");
    const playerSource = readFileSync(resolve("src/components/local-flip-player.tsx"), "utf8");

    equal(source.includes("data:image/svg+xml"), false);
    equal(source.includes("LocalFlipPlayer"), true);
    equal(playerSource.includes('eraserRenderMode="paint"'), true);
    equal(playerSource.includes('renderMode="pressure-lite"'), true);
    equal(playerSource.includes("pointsPerPressureSegment={4}"), true);
  });
});

describe("render route", () => {
  it("does not show a secondary return-to-preview button", () => {
    const source = readFileSync(resolve("app/project/[id]/render.tsx"), "utf8");

    equal(source.includes("미리보기로 돌아가기"), false);
  });
});

describe("shared player image contract", () => {
  it("uses expo-image for remote frame caching", () => {
    const source = readFileSync(resolve("src/components/flip-player.tsx"), "utf8");

    equal(source.includes('from "expo-image"'), true);
    equal(source.includes('cachePolicy="memory-disk"'), true);
    equal(source.includes("resizeMode="), false);
  });

  it("loads manifests through the server API instead of direct R2 env reads", () => {
    const source = readFileSync(resolve("app/v/[shareId]/index.tsx"), "utf8");

    equal(source.includes("EXPO_PUBLIC_R2_PUBLIC_BASE_URL"), false);
    equal(source.includes("/api/shares/"), true);
    equal(source.includes("/manifest"), true);
  });
});
