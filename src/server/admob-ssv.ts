export type AdMobSsvQuery = {
  signedContent: string;
  signature: string;
  keyId: number;
  adUnit: string;
  customData: string;
  transactionId: string;
};

const SIGNATURE_SUFFIX_PATTERN = /&signature=([^&]+)&key_id=(\d+)$/;

export function parseAdMobSsvQuery(rawQuery: string): AdMobSsvQuery {
  const suffix = SIGNATURE_SUFFIX_PATTERN.exec(rawQuery);
  if (!suffix || suffix.index <= 0) {
    throw new Error("invalid AdMob SSV signature suffix");
  }

  const signedContent = rawQuery.slice(0, suffix.index);
  const values = new URLSearchParams(signedContent);
  const adUnit = values.get("ad_unit");
  const customData = values.get("custom_data");
  const transactionId = values.get("transaction_id");
  if (!adUnit || !customData || !transactionId) {
    throw new Error("missing AdMob SSV fields");
  }

  return {
    signedContent,
    signature: suffix[1],
    keyId: Number(suffix[2]),
    adUnit,
    customData,
    transactionId,
  };
}
