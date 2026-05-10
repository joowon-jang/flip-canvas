import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { equal } from "node:assert/strict";
import { describe, it } from "./harness";

describe("button web style contract", () => {
  it("flattens composed Pressable styles before they can reach web DOM links", () => {
    const source = readFileSync(resolve("src/components/button.tsx"), "utf8");

    equal(source.includes("StyleSheet.flatten"), true);
  });

  it("does not fabricate unsupported Pressable hover state", () => {
    const source = readFileSync(resolve("src/components/button.tsx"), "utf8");

    equal(source.includes("hovered"), false);
  });

  it("does not render Button through Link asChild on the library screen", () => {
    const source = readFileSync(resolve("app/index.tsx"), "utf8");

    equal(source.includes("asChild"), false);
  });

  it("renders disabled buttons with disabled accessibility state and style", () => {
    const source = readFileSync(resolve("src/components/button.tsx"), "utf8");

    equal(source.includes("accessibilityState"), true);
    equal(source.includes("buttonDisabled"), true);
  });

  it("exposes the shared Button as a button to assistive technology", () => {
    const source = readFileSync(resolve("src/components/button.tsx"), "utf8");

    equal(source.includes('accessibilityRole="button"'), true);
  });
});
