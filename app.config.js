const base = require("./app.json").expo;

const TEST_ANDROID_ADMOB_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const TEST_IOS_ADMOB_APP_ID = "ca-app-pub-3940256099942544~1458002511";
const storeBuild = process.env.FLIPCANVAS_STORE_BUILD === "true";
const storeAdMobVariables = [
  "ADMOB_ANDROID_APP_ID",
  "ADMOB_IOS_APP_ID",
  "EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_AD_UNIT_ID",
  "EXPO_PUBLIC_ADMOB_IOS_REWARDED_AD_UNIT_ID",
];
const missingStoreAdMobVariables = storeAdMobVariables.filter(
  (name) => !process.env[name],
);

if (storeBuild && missingStoreAdMobVariables.length > 0) {
  throw new Error(
    `beta/production 빌드에 필요한 환경 변수가 없습니다: ${missingStoreAdMobVariables.join(", ")}`,
  );
}

module.exports = {
  ...base,
  plugins: [
    ...base.plugins.filter((plugin) => plugin !== "react-native-google-mobile-ads"),
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || TEST_ANDROID_ADMOB_APP_ID,
        iosAppId: process.env.ADMOB_IOS_APP_ID || TEST_IOS_ADMOB_APP_ID,
        delayAppMeasurementInit: true,
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: "완성한 플립북 영상을 사진 보관함에 저장합니다.",
        savePhotosPermission: "완성한 플립북 영상을 사진 보관함에 저장합니다.",
        isAccessMediaLocationEnabled: false,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#F3EBDD",
      },
    ],
  ],
};
