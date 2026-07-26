import { redisCommand } from "./redis";

const LIMIT_SCRIPT = `
local next = redis.call("INCR", KEYS[1])
if next == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
return next
`;

function utcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function incrementDaily(key: string): Promise<number> {
  return redisCommand<number>("EVAL", LIMIT_SCRIPT, 1, key, 60 * 60 * 48);
}

export async function consumeInterpolationLimit(clientInstanceId: string): Promise<boolean> {
  const day = utcDateKey();
  const clientLimit = Number(process.env.AI_DAILY_CLIENT_LIMIT ?? 20);
  const globalLimit = Number(process.env.AI_DAILY_GLOBAL_LIMIT ?? 100);
  const [clientCount, globalCount] = await Promise.all([
    incrementDaily(`flipcanvas:ai-limit:client:${day}:${clientInstanceId}`),
    incrementDaily(`flipcanvas:ai-limit:global:${day}`),
  ]);
  return clientCount <= clientLimit && globalCount <= globalLimit;
}
