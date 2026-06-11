import { requestAdvice, type AdviceModelResult } from "./model.js";
import { createRateLimiter, type RateLimiter } from "./rateLimit.js";
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

export const IP_RATE_LIMIT = { limit: 10, windowMs: 60_000 };
export const GLOBAL_RATE_LIMIT = { limit: 100, windowMs: 60_000 };

const defaultDeps: AdviceHandlerDeps = {
  ipLimiter: createRateLimiter(IP_RATE_LIMIT),
  globalLimiter: createRateLimiter(GLOBAL_RATE_LIMIT),
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
  const apiKey = deps.getApiKey();
  if (apiKey === undefined || apiKey === "") {
    return json(503, { error: "not_configured" });
  }
  const perIp = deps.ipLimiter.check(clientIp(request));
  if (!perIp.allowed) return rateLimited(perIp.retryAfterSeconds);
  const global = deps.globalLimiter.check("global");
  if (!global.allowed) return rateLimited(global.retryAfterSeconds);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const parsed = parseAdviceRequest(body);
  if (parsed === null) {
    return json(400, { error: "invalid_request" });
  }
  const result = await deps.requestAdvice(parsed, apiKey);
  if (!result.ok) {
    return json(result.status, { error: result.code });
  }
  return json(200, { advice: result.advice });
}
