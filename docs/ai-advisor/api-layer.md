# The API Layer — `/api/advice`, Rate Limiting, Secrets

The prompted advisor talks to [Anthropic](https://docs.anthropic.com/) through a **server-side** [Vercel function](https://vercel.com/docs/functions) so the API key never ships in the browser bundle. This doc traces the full server path, the rate limiting, the secrets, the complete error-code table, and the client contract.

```
browser (client.ts) ──POST /api/advice──▶ api/advice.ts ──▶ handler.ts ──▶ model.ts ──▶ Anthropic
                                                              (gatekeeping)   (prompt + parse)
```

- [The serverless entry](#the-serverless-entry)
- [The handler: gatekeeping](#the-handler-gatekeeping)
- [Rate limiting](#rate-limiting)
- [Secrets & BYOK](#secrets--byok)
- [Error codes](#error-codes)
- [The client contract](#the-client-contract)
- [Serving the ONNX models](#serving-the-onnx-models)

---

## The serverless entry

**File:** [`api/advice.ts`](../../api/advice.ts) — the entire file:

```ts
import { handleAdviceRequest } from "../src/ai/advisor/handler.js";

export const maxDuration = 30;

export function POST(request: Request): Promise<Response> {
  return handleAdviceRequest(request);
}
```

- It's a [web-standard `Request → Response`](https://developer.mozilla.org/en-US/docs/Web/API/Request) `POST` handler — the default **Node.js** [Vercel function runtime](https://vercel.com/docs/functions/runtimes) (there is no `export const runtime = "edge"`).
- [`maxDuration = 30`](https://vercel.com/docs/functions/configuring-functions/duration) gives the function a 30 s ceiling — comfortably above the model's 25 s timeout (`MODEL_TIMEOUT_MS`).
- All logic lives in `handler.ts` so it can be unit-tested without a server (`handler.test.ts` injects `AdviceHandlerDeps`).

---

## The handler: gatekeeping

**File:** [`src/ai/advisor/handler.ts`](../../src/ai/advisor/handler.ts) — `handleAdviceRequest(request, deps)`

The handler runs these gates **in order**, short-circuiting on the first failure:

1. **Method.** Non-`POST` → `405 { error: "method_not_allowed" }` with an `Allow: POST` header.
2. **Key resolution.** Read and trim the `x-advisor-key` header. `usingPlayerKey` iff it's non-empty. The effective `apiKey` is the **player key if present, else the server `ANTHROPIC_API_KEY`** (`deps.getApiKey()`). If neither exists → `503 { error: "not_configured" }`.
3. **Rate limiting** (only when **not** `usingPlayerKey`): the per-IP limiter (`clientIp` = first `x-forwarded-for` entry, else `"unknown"`), then the global limiter. Either rejection → `429 { error: "rate_limited" }` with a `Retry-After` header.
4. **Body size.** `request.text()` longer than `MAX_BODY_CHARS = 60_000` → `413 { error: "payload_too_large" }`.
5. **JSON parse.** Failure → `400 { error: "invalid_json" }`.
6. **Schema.** `parseAdviceRequest(body)` returning `null` → `400 { error: "invalid_request" }`.
7. **Model call.** `deps.requestAdvice(parsed, apiKey)`. On failure, the handler returns the model's `result.status` + `result.code` — **except** one masking case: if the failure is `invalid_player_key` but the **server** key was in use (`!usingPlayerKey`), it's remapped to `502 { error: "model_error" }` so a misconfigured server key isn't reported to the player as their auth problem.
8. **Success.** `200 { advice }`.

The handler takes an injectable `AdviceHandlerDeps` (`ipLimiter`, `globalLimiter`, `getApiKey`, `requestAdvice`); the default wires the real rate limiters, `process.env.ANTHROPIC_API_KEY`, and the real `requestAdvice`.

---

## Rate limiting

Two independent limits protect the shared server key (both **bypassed** for [BYOK](#secrets--byok)):

| Limiter | Limit | Window | Key |
| --- | --- | --- | --- |
| Per-IP (`IP_RATE_LIMIT`) | **3 requests** | **1 hour** (`3_600_000 ms`) | client IP |
| Global (`GLOBAL_RATE_LIMIT`) | **100 requests** | **1 minute** (`60_000 ms`) | the literal `"global"` |

The limiter is a [sliding-window counter](https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms#sliding-window) with a **durable backend and an in-memory fallback**:

- **In-memory** ([`rateLimit.ts`](../../src/ai/advisor/rateLimit.ts)): `createRateLimiter({ limit, windowMs })` keeps a `Map<key, timestamps[]>`, drops timestamps older than the window, allows if fewer than `limit` remain, and returns `retryAfterSeconds` until the oldest hit ages out. It evicts the oldest keys past `MAX_TRACKED_KEYS = 10_000`. This is correct for a single instance but **not** across the many instances a [serverless](https://vercel.com/docs/functions) deployment spins up — hence the durable backend.
- **Durable** ([`durableRateLimit.ts`](../../src/ai/advisor/durableRateLimit.ts)): `createAdviceRateLimiter` builds a [Redis](https://redis.io/)-backed limiter when credentials are present, else falls back to in-memory. It runs an atomic [Upstash Redis REST](https://upstash.com/docs/redis/features/restapi) pipeline per check — `INCR` the key, `EXPIRE … NX` to set the window TTL only on first hit, `TTL` to read remaining time — with a `REDIS_TIMEOUT_MS = 1_500` per-call timeout, and **falls back to in-memory on any Redis error or timeout** (availability over strictness).

Credentials are read from either Upstash or [Vercel KV](https://vercel.com/docs/storage)-style env vars: `UPSTASH_REDIS_REST_URL` / `KV_REST_API_URL` and `UPSTASH_REDIS_REST_TOKEN` / `KV_REST_API_TOKEN`. If either is missing, the durable limiter is skipped and the in-memory one is used.

---

## Secrets & BYOK

| Secret / config | Read at | Purpose | If absent |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | `handler.ts` (`defaultDeps.getApiKey`) | **Server-side** Anthropic key. Never bundled client-side. | `503 not_configured` |
| `x-advisor-key` header | `handler.ts` | Player's own [Anthropic API key](https://docs.anthropic.com/en/api/admin-api/apikeys/get-api-key) ([BYOK](https://en.wikipedia.org/wiki/Bring_your_own_device)). Bypasses both rate limits. | falls back to server key |
| `ADVISOR_MODEL` / `ADVISOR_THINKING` / `ADVISOR_EFFORT` | `model.ts` | Model + inference overrides — see [llm-advisor.md](./llm-advisor.md#calling-claude-buildcreateparams--env-overrides). | model `claude-opus-4-8`, thinking + effort on |
| `UPSTASH_REDIS_REST_URL` / `KV_REST_API_URL` | `durableRateLimit.ts` | Durable rate-limit endpoint. | in-memory limiter |
| `UPSTASH_REDIS_REST_TOKEN` / `KV_REST_API_TOKEN` | `durableRateLimit.ts` | Durable rate-limit auth. | in-memory limiter |

**BYOK flow.** A player can paste their own Anthropic key into the advisor's key form; it's stored **only in their browser** under `localStorage` key `"browslatro:advisor-player-key"` ([`playerKey.ts`](../../src/ai/advisor/playerKey.ts), with `maskPlayerKey` for display) and sent as the `x-advisor-key` header. BYOK requests skip the shared rate limits (the player is paying for their own usage) and bill against the player's key. The server never persists it.

---

## Error codes

Every failure is a typed code. The client union ([`client.ts`](../../src/ai/advisor/client.ts)) is the authoritative list:

| Code | HTTP | Origin | Meaning |
| --- | --- | --- | --- |
| `method_not_allowed` | 405 | handler | Not a `POST`. |
| `not_configured` | 503 | handler | No server key and no player key. |
| `rate_limited` | 429 | handler | IP or global limit hit (with `Retry-After`). |
| `payload_too_large` | 413 | handler | Body > 60,000 chars. |
| `invalid_json` | 400 | handler | Body isn't valid JSON. |
| `invalid_request` | 400 | handler | Failed `parseAdviceRequest` schema validation. |
| `advisor_busy` | 503 | model (`RateLimitError`) | Anthropic rate-limited us. |
| `model_timeout` | 504 | model (`APIConnectionTimeoutError`) | 25 s model timeout exceeded. |
| `invalid_player_key` | 401 | model (`AuthenticationError`) | Bad BYOK key. *(Masked to `model_error` 502 if the **server** key failed.)* |
| `model_refusal` | 502 | model (`stop_reason === "refusal"`) | Claude refused to answer. |
| `model_error` | 502 | model | Unparseable/invalid advice, or any other model error. |
| `network_error` | — | client | `fetch` failed (offline, DNS, CORS). |
| `timeout` | — | client | 30 s client `AbortSignal` fired. |
| `invalid_response` | — | client | Response wasn't valid JSON / valid `Advice` / a known server code. |

The UI maps a few of these to actionable affordances — e.g. `invalid_player_key` and an unkeyed `rate_limited` surface the [BYOK](#secrets--byok) key form, and `rate_limited` shows the `Retry-After` countdown.

---

## The client contract

**File:** [`src/ai/advisor/client.ts`](../../src/ai/advisor/client.ts)

- `fetchAdvice(state, candidates, options)` — hand context (`POST { state, candidates }`).
- `fetchContextAdvice(request, options)` — shop/pack/blind context (`POST request`).

Both route through `postAdviceRequest`, which:

- POSTs JSON to `ADVICE_ENDPOINT = "/api/advice"` with `content-type: application/json` and, if a player key is stored/overridden, the `x-advisor-key` header.
- Enforces a client-side timeout of `ADVICE_CLIENT_TIMEOUT_MS = 30_000` via [`AbortSignal.timeout`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) (longer than the server's 25 s so the server's typed error wins the race).
- Parses the response, maps a known server `{ error }` code through the `SERVER_CODES` allow-list (unknown → `invalid_response`), reads any `Retry-After` into `retryAfterSeconds`, and **re-validates** the returned advice with `isAdvice(advice, candidates.length)` before trusting it.

The result is a discriminated union — `{ ok: true, advice } | { ok: false, code, retryAfterSeconds? }` — that the [hooks](./llm-advisor.md#the-ui-hooks--surfaces) turn into render state.

---

## Serving the ONNX models

The [ONNX policy models](./ml-pipeline.md#onnx-export) are static assets in [`public/models/`](../../public/models/), fetched by the browser at `"/models/advisor-policy-v9.onnx"` etc. [`vercel.json`](../../vercel.json) gives them (and hashed `/assets/`) a one-year immutable cache:

```json
{ "source": "/models/(.*)", "headers": [
  { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ] }
```

Model files are content-versioned in their names (`advisor-policy-v{N}.onnx`), so `immutable` caching is safe — a new model is a new URL. `index.html` and `sw.js` are served `max-age=0, must-revalidate` so app updates land immediately. There is no special build step copying the models; they're committed under `public/` and served as-is. The current production files are `advisor-policy-v9.onnx` (hand, ~400 KB) and `advisor-shop-policy-v14.onnx` (shop, ~85 KB).
