export type RewardState = "pending" | "granted" | "reserved" | "consumed";

export type RewardRecord = {
  nonce: string;
  clientInstanceId: string;
  state: RewardState;
  createdAt: number;
  transactionId?: string;
  requestId?: string;
};

export type RewardEvent =
  | { type: "verify"; transactionId: string }
  | { type: "reserve"; requestId: string }
  | { type: "succeed"; requestId: string }
  | { type: "fail"; requestId: string };

export function transitionReward(record: RewardRecord, event: RewardEvent): RewardRecord {
  if (event.type === "verify" && record.state === "pending") {
    return { ...record, state: "granted", transactionId: event.transactionId };
  }
  if (event.type === "reserve" && record.state === "granted") {
    return { ...record, state: "reserved", requestId: event.requestId };
  }
  if (event.type === "succeed" && record.state === "reserved" && record.requestId === event.requestId) {
    return { ...record, state: "consumed" };
  }
  if (event.type === "fail" && record.state === "reserved" && record.requestId === event.requestId) {
    const { requestId: _requestId, ...restored } = record;
    return { ...restored, state: "granted" };
  }
  return record;
}
