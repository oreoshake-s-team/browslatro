import { SlidingWindowRateLimiter } from "./rateLimit";
import { parseAdviceRequest } from "./validate";

export type AdviceErrorCode =
  | "rate_limited"
  | "advisor_busy"
  | "payload_too_large"
  | "invalid_json"
  | "invalid_request"
  | "model_not_configured";

export interface AdviceHandlerConfig {
  readonly perIpLimit: number;
  readonly globalLimit: number;
  readonly windowMs: number;
}

export const DEFAULT_ADVICE_CONFIG: AdviceHandlerConfig = {
  perIpLimit: 10,
  globalLimit: 60,
  windowMs: 60_000,
};

export const MAX_BODY_BYTES = 32_768;

interface ErrorExtras {
  readonly detail?: string;
  readonly retryAfterSeconds?: number;
}

function errorResponse(
  status: number,
  code: AdviceErrorCode,
  extras: ErrorExtras = {},
): Response {
  const headers = new Headers({ "content-type": "application/json" });
  if (extras.retryAfterSeconds !== undefined) {
    headers.set("retry-after", String(extras.retryAfterSeconds));
  }
  const error =
    extras.detail !== undefined ? { code, detail: extras.detail } : { code };
  return new Response(JSON.stringify({ error }), { status, headers });
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function createAdviceHandler(
  config: AdviceHandlerConfig = DEFAULT_ADVICE_CONFIG,
): (request: Request) => Promise<Response> {
  const perIpLimiter = new SlidingWindowRateLimiter({
    limit: config.perIpLimit,
    windowMs: config.windowMs,
  });
  const globalLimiter = new SlidingWindowRateLimiter({
    limit: config.globalLimit,
    windowMs: config.windowMs,
  });

  return async function handleAdvice(request: Request): Promise<Response> {
    const now = Date.now();
    const perIp = perIpLimiter.check(clientKey(request), now);
    if (!perIp.allowed) {
      return errorResponse(429, "rate_limited", {
        retryAfterSeconds: perIp.retryAfterSeconds,
      });
    }
    const global = globalLimiter.check("global", now);
    if (!global.allowed) {
      return errorResponse(429, "advisor_busy", {
        retryAfterSeconds: global.retryAfterSeconds,
      });
    }
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return errorResponse(413, "payload_too_large");
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return errorResponse(400, "invalid_json");
    }
    const parsed = parseAdviceRequest(body);
    if (!parsed.ok) {
      return errorResponse(400, "invalid_request", { detail: parsed.error });
    }
    return errorResponse(501, "model_not_configured");
  };
}

export const POST = createAdviceHandler();
