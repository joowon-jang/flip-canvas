import { getInterpolationJob, saveInterpolationJob } from "../../../../src/server/ai-job-store";
import { readRifeInterpolation } from "../../../../src/server/fal-rife";
import { clientInstanceIdFromRequest, jsonResponse } from "../../../../src/server/http";
import { consumeReward, restoreReward } from "../../../../src/server/reward-store";

export async function GET(request: Request): Promise<Response> {
  const requestId = new URL(request.url).pathname.split("/").pop() ?? "";
  const job = await getInterpolationJob(requestId);
  if (!job || clientInstanceIdFromRequest(request) !== job.clientInstanceId) {
    return jsonResponse({ error: "interpolation not found" }, 404);
  }
  if (job.status === "complete") {
    return jsonResponse({ requestId, status: "complete", imageUrls: job.imageUrls });
  }
  if (job.status === "failed") {
    return jsonResponse({ requestId, status: "failed", error: job.error });
  }

  try {
    const result = await readRifeInterpolation(job.falRequestId);
    if (result.status === "processing") {
      return jsonResponse({ requestId, status: "processing" });
    }
    if (result.imageUrls.length !== job.frameCount) {
      throw new Error("fal.ai returned an unexpected frame count");
    }

    await consumeReward(job.rewardNonce, requestId);
    const completeJob = { ...job, status: "complete" as const, imageUrls: result.imageUrls };
    await saveInterpolationJob(completeJob);
    return jsonResponse({ requestId, status: "complete", imageUrls: result.imageUrls });
  } catch {
    await restoreReward(job.rewardNonce, requestId).catch(() => undefined);
    const failedJob = { ...job, status: "failed" as const, error: "AI 프레임 생성에 실패했습니다." };
    await saveInterpolationJob(failedJob).catch(() => undefined);
    return jsonResponse({ requestId, status: "failed", error: failedJob.error }, 502);
  }
}
