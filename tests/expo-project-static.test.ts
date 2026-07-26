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

type AppConfig = {
  newArchEnabled?: boolean;
  experiments?: {
    typedRoutes?: boolean;
    reactCompiler?: boolean;
  };
};

describe("expo project configuration", () => {
  it("declares Expo peer dependencies directly", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as PackageJson;

    equal(Boolean(pkg.dependencies?.["expo-constants"]), true);
    equal(Boolean(pkg.dependencies?.["expo-linking"]), true);
    equal(Boolean(pkg.dependencies?.["react-native-worklets"]), true);
  });

  it("enables React Compiler and typed routes while using the default New Architecture", () => {
    const app = require(resolve("app.config.js")) as AppConfig;

    equal(app.experiments?.typedRoutes, true);
    equal(app.experiments?.reactCompiler, true);
    equal(app.newArchEnabled, undefined);
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

  it("targets the minimum iOS version required by Expo SDK 57", () => {
    const podfile = readFileSync(resolve("ios/Podfile"), "utf8");
    const podfileProperties = readFileSync(resolve("ios/Podfile.properties.json"), "utf8");
    const xcodeProject = readFileSync(resolve("ios/FlipCanvas.xcodeproj/project.pbxproj"), "utf8");

    equal(podfile.includes("|| '16.4'"), true);
    equal(podfileProperties.includes('"ios.deploymentTarget": "16.4"'), true);
    equal(xcodeProject.includes("IPHONEOS_DEPLOYMENT_TARGET = 15.1"), false);
  });

  it("uses the Expo SDK 57 Android application host", () => {
    const application = readFileSync(
      resolve("android/app/src/main/java/com/joowon/flipcanvas/MainApplication.kt"),
      "utf8",
    );

    equal(application.includes("ExpoReactHostFactory.getDefaultReactHost"), true);
    equal(application.includes("ReactNativeHostWrapper"), false);
  });

  it("uses the Swift 6 compatible Expo SDK 57 app delegate", () => {
    const appDelegate = readFileSync(resolve("ios/FlipCanvas/AppDelegate.swift"), "utf8");

    equal(appDelegate.includes("internal import Expo"), true);
    equal(appDelegate.includes("@main"), true);
    equal(appDelegate.includes("bindReactNativeFactory"), false);
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
