import type { HandOption } from "../getHandOptions";
import type { ModelState } from "../modelState";
import { isAdvice, type Advice } from "./advice";

export type AdviceClientErrorCode =
  | "method_not_allowed"
  | "not_configured"
  | "rate_limited"
  | "invalid_json"
  | "invalid_request"
  | "payload_too_large"
  | "advisor_busy"
  | "model_timeout"
  | "model_refusal"
  | "invalid_player_key"
  | "model_error"
  | "network_error"
  | "timeout"
  | "invalid_response";

export type AdviceClientResult =
  | { readonly ok: true; readonly advice: Advice }
  | { readonly ok: false; readonly code: AdviceClientErrorCode };

export const ADVICE_ENDPOINT = "/api/advice";
export const ADVICE_CLIENT_TIMEOUT_MS = 30_000;

const SERVER_CODES: ReadonlySet<AdviceClientErrorCode> = new Set([
  "method_not_allowed",
  "not_configured",
  "rate_limited",
  "invalid_json",
  "invalid_request",
  "payload_too_large",
  "advisor_busy",
  "model_timeout",
  "model_refusal",
  "invalid_player_key",
  "model_error",
]);

export interface FetchAdviceOptions {
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function serverErrorCode(body: unknown): AdviceClientErrorCode {
  if (typeof body === "object" && body !== null) {
    const code = (body as { error?: unknown }).error;
    if (typeof code === "string" && SERVER_CODES.has(code as AdviceClientErrorCode)) {
      return code as AdviceClientErrorCode;
    }
  }
  return "invalid_response";
}

export async function fetchAdvice(
  state: ModelState,
  candidates: ReadonlyArray<HandOption>,
  options: FetchAdviceOptions = {},
): Promise<AdviceClientResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? ADVICE_CLIENT_TIMEOUT_MS;
  let response: Response;
  try {
    response = await fetchFn(ADVICE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state, candidates }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return { ok: false, code: isTimeout(error) ? "timeout" : "network_error" };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, code: "invalid_response" };
  }
  if (!response.ok) {
    return { ok: false, code: serverErrorCode(body) };
  }
  const advice = (body as { advice?: unknown } | null)?.advice;
  if (!isAdvice(advice, candidates.length)) {
    return { ok: false, code: "invalid_response" };
  }
  return { ok: true, advice };
}
