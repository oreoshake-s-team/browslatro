import { createAdviceRateLimiter } from "./durableRateLimit.js";
import { requestAdvice, type AdviceModelResult } from "./model.js";
import type { RateLimiter } from "./rateLimit.js";
import { parseAdviceRequest, type AdviceRequest } from "./types.js";

export interface AdviceHandlerDeps {
  readonly ipLimiter: RateLimiter;
  readonly globalLimiter: RateLimiter;
  readonly getApiKey: () => string | undefined;
  readonly requestAdvice: (
    request: AdviceRequest,
    apiKey: string,
  ) => Promise<AdviceModelResult>;
}

export const IP_RATE_LIMIT = { limit: 3, windowMs: 3_600_000 };
export const GLOBAL_RATE_LIMIT = { limit: 100, windowMs: 60_000 };
export const MAX_BODY_CHARS = 60_000;
export const PLAYER_KEY_HEADER = "x-advisor-key";

const defaultDeps: AdviceHandlerDeps = {
  ipLimiter: createAdviceRateLimiter(IP_RATE_LIMIT, "ip"),
  globalLimiter: createAdviceRateLimiter(GLOBAL_RATE_LIMIT, "global"),
  getApiKey: () => process.env.ANTHROPIC_API_KEY,
  requestAdvice,
};

function json(
  status: number,
  body: unknown,
  headers?: Readonly<Record<string, string>>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function clientIp(request: Request): string {
  const first = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first === undefined || first === "" ? "unknown" : first;
}

function rateLimited(retryAfterSeconds: number): Response {
  return json(429, { error: "rate_limited" }, {
    "retry-after": String(retryAfterSeconds),
  });
}

export async function handleAdviceRequest(
  request: Request,
  deps: AdviceHandlerDeps = defaultDeps,
): Promise<Response> {
  if (request.method !== "POST") {
    return json(405, { error: "method_not_allowed" }, { allow: "POST" });
  }
  const playerKey = request.headers.get(PLAYER_KEY_HEADER)?.trim();
  const usingPlayerKey = playerKey !== undefined && playerKey !== "";
  const serverKey = deps.getApiKey();
  const apiKey = usingPlayerKey ? playerKey : serverKey;
  if (apiKey === undefined || apiKey === "") {
    return json(503, { error: "not_configured" });
  }
  if (!usingPlayerKey) {
    const perIp = await deps.ipLimiter.check(clientIp(request));
    if (!perIp.allowed) return rateLimited(perIp.retryAfterSeconds);
    const global = await deps.globalLimiter.check("global");
    if (!global.allowed) return rateLimited(global.retryAfterSeconds);
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) {
    return json(413, { error: "payload_too_large" });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const parsed = parseAdviceRequest(body);
  if (parsed === null) {
    return json(400, { error: "invalid_request" });
  }
  const result = await deps.requestAdvice(parsed, apiKey);
  if (!result.ok) {
    if (result.code === "invalid_player_key" && !usingPlayerKey) {
      return json(502, { error: "model_error" });
    }
    return json(result.status, { error: result.code });
  }
  return json(200, { advice: result.advice });
}
