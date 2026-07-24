import type { RewardRecord } from "./reward-state";
import { getJson, redisCommand } from "./redis";

const REWARD_TTL_SECONDS = 60 * 30;
const TRANSACTION_TTL_SECONDS = 60 * 60 * 24 * 30;

function rewardKey(nonce: string): string {
  return `flipcanvas:reward:${nonce}`;
}

export async function createPendingReward(record: RewardRecord): Promise<boolean> {
  const result = await redisCommand<string | null>(
    "SET",
    rewardKey(record.nonce),
    JSON.stringify(record),
    "NX",
    "EX",
    REWARD_TTL_SECONDS,
  );
  return result === "OK";
}

export function getReward(nonce: string): Promise<RewardRecord | undefined> {
  return getJson<RewardRecord>(rewardKey(nonce));
}

const GRANT_SCRIPT = `
local reward = redis.call("GET", KEYS[1])
if not reward then return "" end
if redis.call("EXISTS", KEYS[2]) == 1 then return "duplicate" end
local record = cjson.decode(reward)
if record.state ~= "pending" then return "" end
record.state = "granted"
record.transactionId = ARGV[1]
redis.call("SET", KEYS[2], "1", "EX", ARGV[2])
local encoded = cjson.encode(record)
redis.call("SET", KEYS[1], encoded, "EX", ARGV[3])
return encoded
`;

export async function grantReward(nonce: string, transactionId: string): Promise<RewardRecord | undefined> {
  const result = await redisCommand<string>(
    "EVAL",
    GRANT_SCRIPT,
    2,
    rewardKey(nonce),
    `flipcanvas:admob-transaction:${transactionId}`,
    transactionId,
    TRANSACTION_TTL_SECONDS,
    REWARD_TTL_SECONDS,
  );
  return result && result !== "duplicate" ? (JSON.parse(result) as RewardRecord) : undefined;
}

const RESERVE_SCRIPT = `
local reward = redis.call("GET", KEYS[1])
if not reward then return "" end
local record = cjson.decode(reward)
if record.state ~= "granted" or record.clientInstanceId ~= ARGV[1] then return "" end
record.state = "reserved"
record.requestId = ARGV[2]
local encoded = cjson.encode(record)
redis.call("SET", KEYS[1], encoded, "EX", ARGV[3])
return encoded
`;

export async function reserveReward(nonce: string, clientInstanceId: string, requestId: string): Promise<boolean> {
  const result = await redisCommand<string>(
    "EVAL",
    RESERVE_SCRIPT,
    1,
    rewardKey(nonce),
    clientInstanceId,
    requestId,
    REWARD_TTL_SECONDS,
  );
  return Boolean(result);
}

const COMPLETE_SCRIPT = `
local reward = redis.call("GET", KEYS[1])
if not reward then return "" end
local record = cjson.decode(reward)
if record.state ~= "reserved" or record.requestId ~= ARGV[1] then return "" end
if ARGV[2] == "succeed" then
  record.state = "consumed"
else
  record.state = "granted"
  record.requestId = nil
end
local encoded = cjson.encode(record)
redis.call("SET", KEYS[1], encoded, "EX", ARGV[3])
return encoded
`;

async function completeReservedReward(nonce: string, requestId: string, outcome: "succeed" | "fail"): Promise<boolean> {
  const result = await redisCommand<string>(
    "EVAL",
    COMPLETE_SCRIPT,
    1,
    rewardKey(nonce),
    requestId,
    outcome,
    REWARD_TTL_SECONDS,
  );
  return Boolean(result);
}

export function consumeReward(nonce: string, requestId: string): Promise<boolean> {
  return completeReservedReward(nonce, requestId, "succeed");
}

export function restoreReward(nonce: string, requestId: string): Promise<boolean> {
  return completeReservedReward(nonce, requestId, "fail");
}
