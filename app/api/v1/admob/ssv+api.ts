import { verifyAdMobSsvQuery } from "../../../../src/server/admob-ssv-verify";
import { jsonResponse } from "../../../../src/server/http";
import { grantReward } from "../../../../src/server/reward-store";

function allowedAdUnits(): Set<string> {
  return new Set(
    (process.env.ADMOB_SSV_ALLOWED_AD_UNITS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export async function GET(request: Request): Promise<Response> {
  try {
    const queryIndex = request.url.indexOf("?");
    if (queryIndex < 0) {
      return jsonResponse({ error: "missing SSV query" }, 400);
    }
    const callback = await verifyAdMobSsvQuery(request.url.slice(queryIndex + 1));
    if (!allowedAdUnits().has(callback.adUnit)) {
      return jsonResponse({ error: "unrecognized ad unit" }, 403);
    }
    await grantReward(callback.customData, callback.transactionId);
    return new Response("ok", { status: 200 });
  } catch {
    return jsonResponse({ error: "invalid SSV callback" }, 400);
  }
}
