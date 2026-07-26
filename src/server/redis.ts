type RedisResponse<T> = {
  result?: T;
  error?: string;
};

function redisConfig(): { url: string; token: string } {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis is not configured");
  }
  return { url: url.replace(/\/$/, ""), token };
}

export async function redisCommand<T>(...command: Array<string | number>): Promise<T> {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const payload = (await response.json()) as RedisResponse<T>;
  if (!response.ok || payload.error) {
    throw new Error(payload.error ?? `Redis request failed (${response.status})`);
  }
  return payload.result as T;
}

export async function getJson<T>(key: string): Promise<T | undefined> {
  const value = await redisCommand<string | null>("GET", key);
  return value ? (JSON.parse(value) as T) : undefined;
}

export async function setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redisCommand("SET", key, JSON.stringify(value), "EX", ttlSeconds);
}
