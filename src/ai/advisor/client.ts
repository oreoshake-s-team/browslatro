import type { HandOption } from "../getHandOptions";
import type { ModelState } from "../modelState";
import { isAdvice, type Advice } from "./advice";
import { readStoredPlayerKey } from "./playerKey";
import type {
  AdviceRequest,
  PackAdviceRequest,
  ShopAdviceRequest,
} from "./types";

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
  | {
      readonly ok: false;
      readonly code: AdviceClientErrorCode;
      readonly retryAfterSeconds?: number;
    };

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

export const PLAYER_KEY_HEADER = "x-advisor-key";

export interface FetchAdviceOptions {
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
  readonly playerKey?: string | null;
}

function retryAfterSeconds(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (header === null) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
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

async function postAdviceRequest(
  request: AdviceRequest,
  options: FetchAdviceOptions,
): Promise<AdviceClientResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? ADVICE_CLIENT_TIMEOUT_MS;
  const playerKey =
    options.playerKey === undefined ? readStoredPlayerKey() : options.playerKey;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (playerKey !== null && playerKey !== "") {
    headers[PLAYER_KEY_HEADER] = playerKey;
  }
  let response: Response;
  try {
    response = await fetchFn(ADVICE_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
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
    return {
      ok: false,
      code: serverErrorCode(body),
      retryAfterSeconds: retryAfterSeconds(response),
    };
  }
  const advice = (body as { advice?: unknown } | null)?.advice;
  if (!isAdvice(advice, request.candidates.length)) {
    return { ok: false, code: "invalid_response" };
  }
  return { ok: true, advice };
}

export async function fetchAdvice(
  state: ModelState,
  candidates: ReadonlyArray<HandOption>,
  options: FetchAdviceOptions = {},
): Promise<AdviceClientResult> {
  return postAdviceRequest({ state, candidates }, options);
}

export async function fetchContextAdvice(
  request: ShopAdviceRequest | PackAdviceRequest,
  options: FetchAdviceOptions = {},
): Promise<AdviceClientResult> {
  return postAdviceRequest(request, options);
}
