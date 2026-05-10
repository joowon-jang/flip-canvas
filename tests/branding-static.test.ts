import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

type PackageJson = {
  name?: string;
};

type AppJson = {
  expo?: {
    name?: string;
    slug?: string;
    scheme?: string;
    ios?: {
      bundleIdentifier?: string;
    };
    android?: {
      package?: string;
    };
  };
};

describe("app branding", () => {
  it("uses Flip Canvas as the app brand while keeping FlipBook for project units", () => {
    const app = JSON.parse(readFileSync(resolve("app.json"), "utf8")) as AppJson;
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as PackageJson;
    const readme = readFileSync(resolve("README.md"), "utf8");
    const library = readFileSync(resolve("app/index.tsx"), "utf8");
    const player = readFileSync(resolve("app/v/[shareId]/index.tsx"), "utf8");
    const androidBuild = readFileSync(resolve("android/app/build.gradle"), "utf8");
    const mainActivity = readFileSync(resolve("android/app/src/main/java/com/joowon/flipcanvas/MainActivity.kt"), "utf8");
    const mainApplication = readFileSync(resolve("android/app/src/main/java/com/joowon/flipcanvas/MainApplication.kt"), "utf8");
    const androidManifest = readFileSync(resolve("android/app/src/main/AndroidManifest.xml"), "utf8");
    const androidSettings = readFileSync(resolve("android/settings.gradle"), "utf8");
    const nativeStrings = readFileSync(resolve("android/app/src/main/res/values/strings.xml"), "utf8");
    const podspec = readFileSync(resolve("modules/stylus-input/ios/StylusInput.podspec"), "utf8");

    equal(app.expo?.name, "Flip Canvas");
    equal(app.expo?.slug, "flip-canvas");
    equal(app.expo?.scheme, "flipcanvas");
    equal(app.expo?.ios?.bundleIdentifier, "com.joowon.flipcanvas");
    equal(app.expo?.android?.package, "com.joowon.flipcanvas");
    equal(pkg.name, "flip-canvas");
    equal(readme.startsWith("# Flip Canvas"), true);
    equal(library.includes("Flip Canvas"), true);
    equal(player.includes('"Flip Canvas"'), true);
    equal(nativeStrings.includes("<string name=\"app_name\">Flip Canvas</string>"), true);
    equal(androidBuild.includes("namespace 'com.joowon.flipcanvas'"), true);
    equal(androidBuild.includes("applicationId 'com.joowon.flipcanvas'"), true);
    equal(mainActivity.includes("package com.joowon.flipcanvas"), true);
    equal(mainApplication.includes("package com.joowon.flipcanvas"), true);
    equal(androidSettings.includes("rootProject.name = 'FlipCanvas'"), true);
    equal(androidManifest.includes('android:scheme="flipcanvas"'), true);
    equal(androidManifest.includes('android:scheme="exp+flipcanvas"'), true);
    equal(podspec.includes("Flip Canvas"), true);
    equal(library.includes('title="새 플립북"'), true);
  });
});
