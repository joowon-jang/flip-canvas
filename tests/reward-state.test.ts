import { equal } from "node:assert/strict";

import { transitionReward, type RewardRecord } from "../src/server/reward-state";
import { describe, it } from "./harness";

const pending: RewardRecord = {
  nonce: "reward_1234567890",
  clientInstanceId: "client_1234567890",
  state: "pending",
  createdAt: 1,
};

describe("reward entitlement state", () => {
  it("grants, reserves, and consumes exactly one rewarded batch", () => {
    const granted = transitionReward(pending, { type: "verify", transactionId: "tx_1" });
    const reserved = transitionReward(granted, { type: "reserve", requestId: "request_1" });
    const consumed = transitionReward(reserved, { type: "succeed", requestId: "request_1" });

    equal(granted.state, "granted");
    equal(reserved.state, "reserved");
    equal(consumed.state, "consumed");
    equal(transitionReward(consumed, { type: "reserve", requestId: "request_2" }), consumed);
  });

  it("restores the entitlement when the provider request fails", () => {
    const granted = transitionReward(pending, { type: "verify", transactionId: "tx_1" });
    const reserved = transitionReward(granted, { type: "reserve", requestId: "request_1" });
    const restored = transitionReward(reserved, { type: "fail", requestId: "request_1" });

    equal(restored.state, "granted");
    equal(restored.requestId, undefined);
  });
});
