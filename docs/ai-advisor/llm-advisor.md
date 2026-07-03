# The Prompted LLM Advisor

This is the [Claude](https://docs.anthropic.com/en/docs/intro-to-claude)-powered half of the advisor — the one that produces a **recommendation plus a plain-language explanation, a tempting alternative, and a transferable concept**. It lives in [`src/ai/advisor/`](../../src/ai/advisor/) and is reached through the [`/api/advice`](./api-layer.md) route.

Everything here obeys the core rule from the [overview](./README.md#the-engine--llm-division-of-labor): **the model picks an index into engine-vetted candidates and may only quote numbers the engine already computed.**

- [Request shapes](#request-shapes) — the four advice contexts
- [The system prompt](#the-system-prompt)
- [The per-context user message](#the-per-context-user-message)
- [Structured output: the `ADVICE_SCHEMA`](#structured-output-the-advice_schema)
- [Calling Claude: `buildCreateParams` & env overrides](#calling-claude-buildcreateparams--env-overrides)
- [Validating the answer](#validating-the-answer)
- [The UI hooks & surfaces](#the-ui-hooks--surfaces)

---

## Request shapes

**File:** [`src/ai/advisor/types.ts`](../../src/ai/advisor/types.ts)

There are **four advice contexts**, discriminated by a `context` field (a *hand* request has no `context`). Each is validated by `parseAdviceRequest(body)` with strict type guards before it ever reaches the model.

| Context | Shape | Candidates |
| --- | --- | --- |
| **Hand** (play/discard) | `{ state: ModelState, candidates: HandOption[] }` (no `context`) | `HandOption[]` from [`getHandOptions`](./engine-plumbing.md#gethandoptions--candidate-enumeration--pruning) |
| **Shop** | `{ context: "shop", shop: ShopAdviceState, candidates }` | `{action:"buy",item} \| {action:"reroll",cost} \| {action:"leave"}` |
| **Pack** | `{ context: "pack", pack: PackAdviceState, candidates }` | pick options + a tail `skip` |
| **Blind** | `{ context: "blind", blind: BlindAdviceState, candidates }` | exactly `[play, skip]` |

Guard rails baked into `types.ts`: `MAX_CANDIDATES = 12`, `MIN_CONTEXT_CANDIDATES = 2` (shop/pack/blind must offer at least two), `MAX_HAND_CARDS = 16`, `MAX_JOKERS = 16`, `MAX_OWNED_VOUCHERS = 32`. The context request states (`ShopAdviceState`, `PackAdviceState`, `BlindAdviceState`) carry exactly the fields the model needs to reason — money, ante, current jokers/consumables (as `NamedRef`s), capacities, owned vouchers, score target, boss note — and nothing more.

The **request plans** that build these from live game state are separate, testable modules so the UI stays thin:

- [`shopAdvicePlan.ts`](../../src/ai/advisor/shopAdvicePlan.ts) — `buildShopAdvicePlan(input)` → buy/reroll/leave candidates + parallel UI `actions`, or `null` if too few.
- [`packAdvicePlan.ts`](../../src/ai/advisor/packAdvicePlan.ts) — `buildPackAdvicePlan(input)` → pickable options (respecting capacity) + a `skip` tail.
- [`blindAdvicePlan.ts`](../../src/ai/advisor/blindAdvicePlan.ts) — `buildBlindAdvicePlan(input)` → `[play, skip]`; returns `null` for the boss blind or when no skip offer exists.
- [`snapshot.ts`](../../src/ai/advisor/snapshot.ts) / [`contextSnapshots.ts`](../../src/ai/advisor/contextSnapshots.ts) — convert live `GameState` into these request states (`toModelStateInput`, `jokerRefs`, `shopAdviceItem`, …).

---

## The system prompt

**File:** [`src/ai/advisor/model.ts`](../../src/ai/advisor/model.ts) (the `SYSTEM_PROMPT` constant). Quoted verbatim:

> You are an educational Balatro coach. The player sees engine-vetted candidate actions. Your job is to pick the best candidate by index, explain why in plain language, name the most tempting alternative and why it is worse, and tie the choice to one transferable concept. Never invent numbers: every chip, mult, score, or money figure you mention must appear verbatim in the provided data. Recommend the strongest candidate unless a marginally weaker one teaches a clearly more valuable lesson, and say so when you do.

The load-bearing clauses:

- **"pick the best candidate by index"** — constrains the model to the engine's candidate list (the [no-illegal-moves guarantee](./README.md#the-engine--llm-division-of-labor)).
- **"Never invent numbers … must appear verbatim in the provided data"** — the anti-hallucination rule. Because the only numbers in the prompt are engine-computed, this keeps the prose factually pinned to the engine.
- **"a transferable concept"** — the pedagogical goal; the advisor is a *coach*, not just a solver.
- **"unless a marginally weaker one teaches a clearly more valuable lesson, and say so"** — permits (and surfaces) the rare teaching deviation from pure score-maximization.

The system block is sent with [`cache_control: { type: "ephemeral" }`](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching), so the static prompt is [prompt-cached](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) across requests to cut latency and cost.

---

## The per-context user message

`buildUserMessage(request)` dispatches by context to a builder (`buildHandMessage`, `buildShopMessage`, `buildPackMessage`, `buildBlindMessage`). Each lays out, in order:

1. **The context** (what decision this is).
2. **The serialized game state** (the request's `state`/`shop`/`pack`/`blind`) as JSON.
3. **Joker-order note** (hand context) — jokers trigger left-to-right, and order matters, so the message says so explicitly.
4. **Indexed candidates** — the candidate list with explicit indices, so "recommend index N" is unambiguous.
5. **Retrieved [wiki](./wiki-retrieval.md) notes** — exact-key tips for the jokers/boss/combos/economy/stake in play, injected as reference material. Hand uses `retrieveWikiEntries(state)`; shop uses `retrieveShopWikiEntries(...)`; pack uses `retrieveJokerWikiEntries(...)`; blind adds the `BOSS_WIKI` note.

This is the *only* place numbers enter the conversation, which is what makes the "never invent numbers" rule enforceable.

---

## Structured output: the `ADVICE_SCHEMA`

Instead of free-text parsing, the model is forced to emit JSON matching a [JSON-schema structured output](https://docs.anthropic.com/en/docs/build-with-claude/tool-use). `ADVICE_SCHEMA` (verbatim from `model.ts`):

```ts
export const ADVICE_SCHEMA = {
  type: "object",
  properties: {
    recommendationIndex: { type: "integer" },
    alternativeIndex: { type: "integer" },
    whyAlternativeWorse: { type: "string" },
    explanation: { type: "string" },
    concept: { type: "string" },
  },
  required: [
    "recommendationIndex", "alternativeIndex", "whyAlternativeWorse",
    "explanation", "concept",
  ],
  additionalProperties: false,
} as const;
```

The matching TypeScript type ([`advice.ts`](../../src/ai/advisor/advice.ts)):

```ts
interface Advice {
  recommendationIndex: number;   // index of the best candidate
  alternativeIndex: number;      // index of the tempting-but-worse candidate
  whyAlternativeWorse: string;   // why the alternative loses
  explanation: string;           // why the recommendation wins
  concept: string;               // one transferable lesson
}
```

This is the **same `chosen`-index label shape** the [training pipeline](./ml-pipeline.md) consumes — which is what makes the LLM usable as an offline *teacher* for the ONNX policy (see [teacher distillation](./ml-pipeline.md#teacher-distillation-offline-machinery)).

---

## Calling Claude: `buildCreateParams` & env overrides

`buildCreateParams(request)` assembles the [Anthropic Messages API](https://docs.anthropic.com/en/api/messages) call (verbatim shape):

```ts
{
  model: process.env.ADVISOR_MODEL ?? MODEL_ID,        // MODEL_ID = "claude-fable-5"
  max_tokens: MAX_OUTPUT_TOKENS,                        // 16_000
  ...(useThinking ? { thinking: { type: "adaptive" } } : {}),
  output_config: {
    ...(useEffort ? { effort: "low" } : {}),
    format: { type: "json_schema", schema: ADVICE_SCHEMA },
  },
  system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  messages: [{ role: "user", content: buildUserMessage(request) }],
}
```

`requestAdvice(request, apiKey)` then creates the SDK client with `timeout: MODEL_TIMEOUT_MS` (`25_000`) and `maxRetries: 0` (the server, not the SDK, owns retry policy) and calls `client.messages.create(...)`.

**Environment overrides** (all read in `buildCreateParams`/`requestAdvice`; see [running-locally.md](./running-locally.md#environment-variables)):

| Env var | Effect | Default |
| --- | --- | --- |
| `ADVISOR_MODEL` | Override the model id | `claude-fable-5` |
| `ADVISOR_THINKING` | Set to `"none"` to disable [extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) | thinking on (`adaptive`) |
| `ADVISOR_EFFORT` | Set to `"none"` to drop the `effort: "low"` hint | `effort: "low"` |

The `ADVISOR_MODEL` override is also how the [teacher-labeling scripts](./ml-pipeline.md#teacher-distillation-offline-machinery) point `requestAdvice` at a different teacher model (e.g. Claude Sonnet 4.6) without code changes.

---

## Validating the answer

The model's reply is never trusted blindly:

1. **Refusal check** — if `response.stop_reason === "refusal"`, return error code `model_refusal`.
2. **Parse** — `parseAdvice(text, candidateCount)` JSON-parses the text blocks.
3. **Validate** — `isAdvice(parsed, candidateCount)` ([`advice.ts`](../../src/ai/advisor/advice.ts)) checks every field is present and well-typed, that `0 ≤ recommendationIndex < candidateCount` and `0 ≤ alternativeIndex < candidateCount`, and that **the alternative differs from the recommendation**. A malformed answer maps to `model_error`.

Errors from the API call itself are mapped by `mapModelError`: `RateLimitError → advisor_busy (503)`, `APIConnectionTimeoutError → model_timeout (504)`, `AuthenticationError → invalid_player_key (401)`, anything else → `model_error (502)`. The full client-facing table is in [api-layer.md](./api-layer.md#error-codes).

---

## The UI hooks & surfaces

Two React hooks wrap the client and own the request lifecycle state (`idle → loading → ready | error`):

- **[`useSuggestion`](../../src/ai/advisor/useSuggestion.ts)** — generic over the action type; takes a `buildPlan()` and an optional `preRank()` (the ONNX pre-rank). Calls [`fetchContextAdvice`](./api-layer.md#the-client-contract). Consumed by the **Suggest** buttons:
  - [`src/components/shop/ShopSuggestion.tsx`](../../src/components/shop/ShopSuggestion.tsx) — *"Suggest a purchase"*.
  - [`src/components/shop/PackSuggestion.tsx`](../../src/components/shop/PackSuggestion.tsx) — pack-pick suggestion.
  - [`src/components/game/BlindSuggestion.tsx`](../../src/components/game/BlindSuggestion.tsx) — *"Worth skipping?"*.
- **[`useMoveExplanation`](../../src/ai/advisor/useMoveExplanation.ts)** — builds hand candidates via `getHandOptions` and calls [`fetchAdvice`](./api-layer.md#the-client-contract); returns the recommended `HandOption`. Used by the **autopilot** flow (`App.tsx` → `Game.tsx` → [`AutopilotControls.tsx`](../../src/components/game/AutopilotControls.tsx), with [`useAutopilot`](../../src/hooks/useAutopilot.ts) driving `autopilotIdle`/`chooseAutopilotAction` from [`autopilot.ts`](../../src/ai/advisor/autopilot.ts)).

All four surfaces render through one component, [`src/components/advisor/SuggestionAdvice.tsx`](../../src/components/advisor/SuggestionAdvice.tsx), which displays the four states: hidden (idle), a "Thinking…"/model-download progress state (loading, optionally showing the ONNX pre-rank), the recommendation + alternative + concept (ready), and an error message with an optional [BYOK](./api-layer.md#secrets--byok) key form (error).
