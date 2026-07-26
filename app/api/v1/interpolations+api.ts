import { saveInterpolationJob } from "../../../src/server/ai-job-store";
import { cancelRifeInterpolation, submitRifeInterpolation } from "../../../src/server/fal-rife";
import { clientInstanceIdFromRequest, jsonResponse, readJsonBody } from "../../../src/server/http";
import { parseInterpolationRequest } from "../../../src/server/interpolation-request";
import { consumeInterpolationLimit } from "../../../src/server/rate-limit";
import { reserveReward, restoreReward } from "../../../src/server/reward-store";

export async function POST(request: Request): Promise<Response> {
  let rewardNonce: string | undefined;
  let requestId: string | undefined;
  let falRequestId: string | undefined;

  try {
    const input = parseInterpolationRequest(await readJsonBody(request));
    if (clientInstanceIdFromRequest(request) !== input.clientInstanceId) {
      return jsonResponse({ error: "client mismatch" }, 403);
    }

    requestId = `request_${crypto.randomUUID().replace(/-/g, "")}`;
    rewardNonce = input.rewardNonce;
    if (!(await reserveReward(input.rewardNonce, input.clientInstanceId, requestId))) {
      return jsonResponse({ error: "reward is not available" }, 409);
    }
    if (!(await consumeInterpolationLimit(input.clientInstanceId))) {
      await restoreReward(input.rewardNonce, requestId);
      return jsonResponse({ error: "daily AI limit reached" }, 429);
    }

    falRequestId = await submitRifeInterpolation(input.startImage, input.endImage, input.frameCount);
    await saveInterpolationJob({
      requestId,
      falRequestId,
      clientInstanceId: input.clientInstanceId,
      rewardNonce: input.rewardNonce,
      frameCount: input.frameCount,
      status: "processing",
      createdAt: Date.now(),
    });
    return jsonResponse({ requestId, status: "processing" }, 202);
  } catch (error) {
    if (falRequestId) {
      await cancelRifeInterpolation(falRequestId).catch(() => undefined);
    }
    if (rewardNonce && requestId) {
      await restoreReward(rewardNonce, requestId).catch(() => undefined);
    }
    return jsonResponse({ error: error instanceof Error ? error.message : "interpolation failed" }, 502);
  }
}
