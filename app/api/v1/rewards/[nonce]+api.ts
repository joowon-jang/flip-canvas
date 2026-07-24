import { clientInstanceIdFromRequest, jsonResponse } from "../../../../src/server/http";
import { getReward } from "../../../../src/server/reward-store";

export async function GET(request: Request): Promise<Response> {
  const nonce = new URL(request.url).pathname.split("/").pop() ?? "";
  const clientInstanceId = clientInstanceIdFromRequest(request);
  const reward = await getReward(nonce);
  if (!reward || !clientInstanceId || reward.clientInstanceId !== clientInstanceId) {
    return jsonResponse({ error: "reward not found" }, 404);
  }
  return jsonResponse({ nonce: reward.nonce, state: reward.state });
}
