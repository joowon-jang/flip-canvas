import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

type PackageJson = {
  dependencies?: Record<string, string>;
  expo?: {
    doctor?: {
      appConfigFieldsNotSyncedCheck?: {
        enabled?: boolean;
      };
    };
  };
};

type AppJson = {
  expo?: {
    newArchEnabled?: boolean;
    experiments?: {
      typedRoutes?: boolean;
      reactCompiler?: boolean;
    };
  };
};

describe("expo project configuration", () => {
  it("declares Expo peer dependencies directly", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as PackageJson;

    equal(Boolean(pkg.dependencies?.["expo-constants"]), true);
    equal(Boolean(pkg.dependencies?.["expo-linking"]), true);
    equal(Boolean(pkg.dependencies?.["react-native-worklets"]), true);
  });

  it("enables React Compiler while preserving typed routes and New Architecture config", () => {
    const app = JSON.parse(readFileSync(resolve("app.json"), "utf8")) as AppJson;

    equal(app.expo?.experiments?.typedRoutes, true);
    equal(app.expo?.experiments?.reactCompiler, true);
    equal(app.expo?.newArchEnabled, true);
  });

  it("documents the Android prebuild regeneration policy", () => {
    const readme = readFileSync(resolve("README.md"), "utf8");

    equal(readme.includes("prebuild 재생성 기준"), true);
    equal(readme.includes("npx expo prebuild --clean --platform android"), true);
    equal(readme.includes("npm run android"), true);
    equal(readme.includes("Expo Go"), true);
    equal(readme.includes("development build"), true);
  });

  it("makes the non-CNG Expo Doctor decision explicit in package metadata", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as PackageJson;

    equal(pkg.expo?.doctor?.appConfigFieldsNotSyncedCheck?.enabled, false);
  });
});
