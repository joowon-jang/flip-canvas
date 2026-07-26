import { equal } from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, it } from "./harness";

const syncScript = resolve("scripts/sync-store-admob.js");

describe("store AdMob native configuration", () => {
  it("runs the native sync from the EAS post-install hook", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    equal(pkg.scripts?.["eas-build-post-install"], "node scripts/sync-store-admob.js");
  });

  it("syncs the EAS Android app id into the native manifest", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "flip-canvas-admob-"));
    const manifestPath = join(projectRoot, "android/app/src/main/AndroidManifest.xml");

    try {
      mkdirSync(join(projectRoot, "android/app/src/main"), { recursive: true });
      writeFileSync(
        manifestPath,
        '<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="test-id"/>\n',
      );

      execFileSync(process.execPath, [syncScript], {
        cwd: projectRoot,
        env: {
          ...process.env,
          EAS_BUILD_PLATFORM: "android",
          FLIPCANVAS_STORE_BUILD: "true",
          ADMOB_ANDROID_APP_ID: "ca-app-pub-1234567890123456~1234567890",
        },
      });

      equal(
        readFileSync(manifestPath, "utf8").includes(
          'android:value="ca-app-pub-1234567890123456~1234567890"',
        ),
        true,
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("syncs the EAS iOS app id into the native Info.plist", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "flip-canvas-admob-"));
    const plistPath = join(projectRoot, "ios/FlipCanvas/Info.plist");

    try {
      mkdirSync(join(projectRoot, "ios/FlipCanvas"), { recursive: true });
      writeFileSync(
        plistPath,
        "<key>GADApplicationIdentifier</key>\n<string>test-id</string>\n",
      );

      execFileSync(process.execPath, [syncScript], {
        cwd: projectRoot,
        env: {
          ...process.env,
          EAS_BUILD_PLATFORM: "ios",
          FLIPCANVAS_STORE_BUILD: "true",
          ADMOB_IOS_APP_ID: "ca-app-pub-9876543210987654~0987654321",
        },
      });

      equal(
        readFileSync(plistPath, "utf8").includes(
          "<string>ca-app-pub-9876543210987654~0987654321</string>",
        ),
        true,
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
