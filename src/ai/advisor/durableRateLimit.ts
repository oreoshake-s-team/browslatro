import {
  createRateLimiter,
  type RateLimiter,
  type RateLimiterOptions,
} from "./rateLimit.js";

export interface RedisRestConfig {
  readonly url: string;
  readonly token: string;
}

export const REDIS_TIMEOUT_MS = 1_500;

type EnvSource = Readonly<Record<string, string | undefined>>;

export function redisRestConfigFromEnv(
  env: EnvSource = process.env,
): RedisRestConfig | null {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  if (url === undefined || url === "" || token === undefined || token === "") {
    return null;
  }
  return { url, token };
}

function pipelineResults(payload: unknown): ReadonlyArray<unknown> | null {
  if (!Array.isArray(payload)) return null;
  return payload.map((entry) =>
    typeof entry === "object" && entry !== null && "result" in entry
      ? entry.result
      : undefined,
  );
}

export interface DurableRateLimiterOptions extends RateLimiterOptions {
  readonly prefix: string;
  readonly config: RedisRestConfig;
  readonly fallback: RateLimiter;
}

export function createDurableRateLimiter({
  limit,
  windowMs,
  prefix,
  config,
  fallback,
}: DurableRateLimiterOptions): RateLimiter {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  return {
    async check(key) {
      const redisKey = `advice:${prefix}:${key}`;
      let results: ReadonlyArray<unknown> | null;
      try {
        const response = await fetch(`${config.url}/pipeline`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify([
            ["INCR", redisKey],
            ["EXPIRE", redisKey, String(windowSeconds), "NX"],
            ["TTL", redisKey],
          ]),
          signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
        });
        if (!response.ok) return fallback.check(key);
        results = pipelineResults(await response.json());
      } catch {
        return fallback.check(key);
      }
      const count = results?.[0];
      if (results === null || typeof count !== "number") {
        return fallback.check(key);
      }
      if (count <= limit) return { allowed: true, retryAfterSeconds: 0 };
      const ttl = results[2];
      return {
        allowed: false,
        retryAfterSeconds:
          typeof ttl === "number" && ttl > 0 ? ttl : windowSeconds,
      };
    },
  };
}

export function createAdviceRateLimiter(
  options: RateLimiterOptions,
  prefix: string,
  env: EnvSource = process.env,
): RateLimiter {
  const fallback = createRateLimiter(options);
  const config = redisRestConfigFromEnv(env);
  if (config === null) return fallback;
  return createDurableRateLimiter({ ...options, prefix, config, fallback });
}
