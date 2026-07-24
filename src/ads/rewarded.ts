import mobileAds, {
  AdEventType,
  AdsConsent,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";
import { Platform } from "react-native";

let initialization: Promise<void> | undefined;

export function initializeAds(): Promise<void> {
  initialization ??= (async () => {
    const consent = await AdsConsent.gatherConsent({ tagForUnderAgeOfConsent: false });
    if (consent.canRequestAds) {
      await mobileAds().initialize();
    }
  })();
  return initialization;
}

function rewardedAdUnitId(): string {
  const configured = Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_AD_UNIT_ID,
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_AD_UNIT_ID,
  });
  if (configured) {
    return configured;
  }
  if (__DEV__) {
    return TestIds.REWARDED;
  }
  throw new Error("리워드 광고 단위가 설정되지 않았습니다.");
}

export async function showRewardedInterpolationAd(nonce: string, clientInstanceId: string): Promise<void> {
  await initializeAds();

  return new Promise<void>((resolve, reject) => {
    const ad = RewardedAd.createForAdRequest(rewardedAdUnitId(), {
      serverSideVerificationOptions: {
        customData: nonce,
        userId: clientInstanceId,
      },
    });
    let earned = false;
    const subscriptions = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        void ad.show().catch(reject);
      }),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        subscriptions.forEach((unsubscribe) => unsubscribe());
        if (earned) {
          resolve();
        } else {
          reject(new Error("광고 시청이 완료되지 않았습니다."));
        }
      }),
      ad.addAdEventListener(AdEventType.ERROR, (error) => {
        subscriptions.forEach((unsubscribe) => unsubscribe());
        reject(error);
      }),
    ];
    ad.load();
  });
}
