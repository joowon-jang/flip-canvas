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

  it("documents the native prebuild synchronization policy", () => {
    const readme = readFileSync(resolve("README.md"), "utf8");

    equal(readme.includes("npx expo prebuild --platform all --no-install"), true);
    equal(readme.includes("npx pod-install"), true);
    equal(readme.includes("npm run android"), true);
    equal(readme.includes("npm run ios"), true);
    equal(readme.includes("Expo Go에서는 실행할 수 없습니다"), true);
    equal(readme.includes("modules/video-encoder"), true);
  });

  it("makes the non-CNG Expo Doctor decision explicit in package metadata", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as PackageJson;

    equal(pkg.expo?.doctor?.appConfigFieldsNotSyncedCheck?.enabled, false);
  });

  it("fails store builds before native compilation when real AdMob app ids are missing", () => {
    const config = readFileSync(resolve("app.config.js"), "utf8");
    const eas = readFileSync(resolve("eas.json"), "utf8");

    equal(config.includes('process.env.FLIPCANVAS_STORE_BUILD === "true"'), true);
    equal(config.includes("ADMOB_ANDROID_APP_ID"), true);
    equal(config.includes("ADMOB_IOS_APP_ID"), true);
    equal(config.includes("EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_AD_UNIT_ID"), true);
    equal(config.includes("EXPO_PUBLIC_ADMOB_IOS_REWARDED_AD_UNIT_ID"), true);
    equal(eas.includes('"FLIPCANVAS_STORE_BUILD": "true"'), true);
  });
});
