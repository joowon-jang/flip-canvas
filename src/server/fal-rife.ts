import { fal } from "@fal-ai/client";

import { buildRifeInput } from "./interpolation-request";

const MODEL_ID = "fal-ai/rife";

function configureFal(): void {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error("fal.ai is not configured");
  }
  fal.config({ credentials: key });
}

export async function submitRifeInterpolation(startImage: string, endImage: string, frameCount: number): Promise<string> {
  configureFal();
  const queued = await fal.queue.submit(MODEL_ID, {
    input: buildRifeInput(startImage, endImage, frameCount),
    storageSettings: { expiresIn: "1h" },
  });
  return queued.request_id;
}

export async function readRifeInterpolation(
  requestId: string,
): Promise<{ status: "processing" } | { status: "complete"; imageUrls: string[] }> {
  configureFal();
  const status = await fal.queue.status(MODEL_ID, { requestId });
  if (status.status !== "COMPLETED") {
    return { status: "processing" };
  }

  const result = await fal.queue.result(MODEL_ID, { requestId });
  const imageUrls = result.data.images?.map((image) => image.url).filter(Boolean) ?? [];
  if (imageUrls.length === 0) {
    throw new Error("fal.ai returned no generated frames");
  }
  return { status: "complete", imageUrls };
}

export async function cancelRifeInterpolation(requestId: string): Promise<void> {
  configureFal();
  await fal.queue.cancel(MODEL_ID, { requestId });
}
