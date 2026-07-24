type RewardState = "pending" | "granted" | "reserved" | "consumed";

export type InterpolationStatus =
  | { requestId: string; status: "processing" }
  | { requestId: string; status: "complete"; imageUrls: string[] }
  | { requestId: string; status: "failed"; error: string };

function apiUrl(path: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
  if (!baseUrl && !path.startsWith("/")) {
    throw new Error("invalid API path");
  }
  return `${baseUrl}${path}`;
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(apiUrl(path), init);
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `API request failed (${response.status})`);
  }
  return response;
}

export async function createReward(clientInstanceId: string): Promise<string> {
  const response = await apiFetch("/api/v1/rewards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientInstanceId }),
  });
  const payload = (await response.json()) as { nonce: string };
  return payload.nonce;
}

export async function getRewardState(nonce: string, clientInstanceId: string): Promise<RewardState> {
  const response = await apiFetch(`/api/v1/rewards/${encodeURIComponent(nonce)}`, {
    headers: { "X-Flip-Client": clientInstanceId },
  });
  const payload = (await response.json()) as { state: RewardState };
  return payload.state;
}

export async function submitInterpolation(input: {
  clientInstanceId: string;
  rewardNonce: string;
  startImage: string;
  endImage: string;
  frameCount: number;
}): Promise<string> {
  const response = await apiFetch("/api/v1/interpolations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Flip-Client": input.clientInstanceId,
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as { requestId: string };
  return payload.requestId;
}

export async function getInterpolationStatus(requestId: string, clientInstanceId: string): Promise<InterpolationStatus> {
  const response = await apiFetch(`/api/v1/interpolations/${encodeURIComponent(requestId)}`, {
    headers: { "X-Flip-Client": clientInstanceId },
  });
  return (await response.json()) as InterpolationStatus;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitForGrantedReward(nonce: string, clientInstanceId: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if ((await getRewardState(nonce, clientInstanceId)) === "granted") {
      return;
    }
    await wait(1_500);
  }
  throw new Error("광고 보상 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
}

export async function waitForInterpolation(requestId: string, clientInstanceId: string): Promise<string[]> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const status = await getInterpolationStatus(requestId, clientInstanceId);
    if (status.status === "complete") {
      return status.imageUrls;
    }
    if (status.status === "failed") {
      throw new Error(status.error);
    }
    await wait(1_000);
  }
  throw new Error("AI 처리 시간이 예상보다 길어지고 있습니다. 다시 확인해 주세요.");
}
