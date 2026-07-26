const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

if (process.env.FLIPCANVAS_STORE_BUILD === "true" && process.env.EAS_BUILD_PLATFORM === "android") {
  const appId = process.env.ADMOB_ANDROID_APP_ID;
  if (!appId) {
    throw new Error("ADMOB_ANDROID_APP_ID is required for store builds");
  }

  const manifestPath = resolve("android/app/src/main/AndroidManifest.xml");
  const manifest = readFileSync(manifestPath, "utf8");
  const applicationId =
    /(android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value=")[^"]+(")/;
  const updatedManifest = manifest.replace(applicationId, `$1${appId}$2`);

  if (updatedManifest === manifest) {
    throw new Error("AdMob application id metadata was not found in AndroidManifest.xml");
  }

  writeFileSync(manifestPath, updatedManifest);
} else if (process.env.FLIPCANVAS_STORE_BUILD === "true" && process.env.EAS_BUILD_PLATFORM === "ios") {
  const appId = process.env.ADMOB_IOS_APP_ID;
  if (!appId) {
    throw new Error("ADMOB_IOS_APP_ID is required for store builds");
  }

  const plistPath = resolve("ios/FlipCanvas/Info.plist");
  const plist = readFileSync(plistPath, "utf8");
  const applicationId = /(<key>GADApplicationIdentifier<\/key>\s*<string>)[^<]+(<\/string>)/;
  const updatedPlist = plist.replace(applicationId, `$1${appId}$2`);

  if (updatedPlist === plist) {
    throw new Error("GADApplicationIdentifier was not found in Info.plist");
  }

  writeFileSync(plistPath, updatedPlist);
}
