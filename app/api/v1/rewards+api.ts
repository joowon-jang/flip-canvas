import { jsonResponse, readJsonBody } from "../../../src/server/http";
import { createPendingReward } from "../../../src/server/reward-store";

const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{12,128}$/;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await readJsonBody(request)) as { clientInstanceId?: unknown };
    if (typeof body.clientInstanceId !== "string" || !CLIENT_ID_PATTERN.test(body.clientInstanceId)) {
      return jsonResponse({ error: "invalid clientInstanceId" }, 400);
    }

    const nonce = `reward_${crypto.randomUUID().replace(/-/g, "")}`;
    const created = await createPendingReward({
      nonce,
      clientInstanceId: body.clientInstanceId,
      state: "pending",
      createdAt: Date.now(),
    });
    if (!created) {
      return jsonResponse({ error: "could not create reward" }, 503);
    }
    return jsonResponse({ nonce, state: "pending" }, 201);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "invalid request" }, 400);
  }
}
