import { getJson, setJson } from "./redis";

const JOB_TTL_SECONDS = 60 * 60;

export type InterpolationJob = {
  requestId: string;
  falRequestId: string;
  clientInstanceId: string;
  rewardNonce: string;
  frameCount: number;
  status: "processing" | "complete" | "failed";
  imageUrls?: string[];
  error?: string;
  createdAt: number;
};

function jobKey(requestId: string): string {
  return `flipcanvas:ai-job:${requestId}`;
}

export function getInterpolationJob(requestId: string): Promise<InterpolationJob | undefined> {
  return getJson<InterpolationJob>(jobKey(requestId));
}

export function saveInterpolationJob(job: InterpolationJob): Promise<void> {
  return setJson(jobKey(job.requestId), job, JOB_TTL_SECONDS);
}
