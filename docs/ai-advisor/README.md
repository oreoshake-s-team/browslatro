# The Browslatro AI/ML Advisor — End-to-End

This is the entry point for understanding **how Browslatro suggests moves to the player**. It documents every module under [`src/ai/`](../../src/ai/), the [`/api/advice`](../../api/advice.ts) serverless route, and the offline [`ml/`](../../ml/) training pipeline, in enough detail that a newcomer can trace a single piece of advice from a button click all the way to the rendered explanation — and back to the data that trained the model behind it.

> Scope note: this document describes **merged code only**. Research directions that are not yet shipped (LLM teacher distillation for the shipped models, single-agent reinforcement learning, etc.) are collected under [Future work](#future-work-open-threads) and clearly marked as not-yet-shipped.

If a term is unfamiliar — whether it is a [Balatro](https://balatrowiki.org/) game mechanic or a machine-learning concept — check the [Glossary](./glossary.md), which links each term to an authoritative spec or explainer.

## Table of contents

| Doc | Covers |
| --- | --- |
| **README.md** (this file) | The two advisor paths, the engine↔LLM division of labor, the end-to-end advice flow + sequence diagram, the core design decisions, and the future-work backlog. |
| [engine-plumbing.md](./engine-plumbing.md) | Candidate enumeration & pruning ([`getHandOptions`](../../src/ai/getHandOptions.ts)), deterministic scoring ([`simulatePlay`](../../src/ai/simulatePlay.ts)), the [`ModelState`](../../src/ai/modelState.ts) projection (and what it deliberately hides), and the [`encode`](../../src/ai/encode.ts) feature vector. |
| [llm-advisor.md](./llm-advisor.md) | The prompted-LLM path: system prompt, per-context user messages, the `submit_advice`-style structured-output schema, env overrides, and response validation ([`src/ai/advisor/`](../../src/ai/advisor/)). |
| [wiki-retrieval.md](./wiki-retrieval.md) | The exact-key wiki lookup, coverage, graceful degradation for unknown keys, and the content licensing/attribution situation. |
| [api-layer.md](./api-layer.md) | The [`/api/advice`](../../api/advice.ts) Vercel function, request validation, rate limiting (in-memory + durable Redis), the full error-code → HTTP-status table, secrets, and the client contract. |
| [ml-pipeline.md](./ml-pipeline.md) | The headless game loop, the Monte-Carlo search expert, dataset generation, human-play capture, the Python training pipeline, ONNX export/inference, evaluation, and the (offline) teacher-distillation machinery. |
| [running-locally.md](./running-locally.md) | Environment variables & secrets, and how to exercise every piece locally: unit tests, the headless loop, dataset generation, training, evaluation, and the API route in dev. |
| [glossary.md](./glossary.md) | Every domain term (game + ML + infra) linked to a spec or explainer. |

This doc set is **complementary** to the existing onboarding material — it does not repeat it:

- [docs/onboarding/README.md](../onboarding/README.md) — the 60-second mental model of the game and the repo map.
- [docs/onboarding/architecture.md](../onboarding/architecture.md) — the four-layer app architecture (Components → Hooks → Store → Pure Rules). The advisor reads from the same [Zustand](https://github.com/pmndrs/zustand) store described there.
- [docs/onboarding/scoring-pipeline.md](../onboarding/scoring-pipeline.md) — the canonical scoring formula. `simulatePlay` is the advisor's headless re-implementation of this; that doc is the source of truth for *why* a score is what it is.
- [docs/onboarding/jokers-and-content.md](../onboarding/jokers-and-content.md) — the joker `effect` discriminated union the encoder buckets into five categories.
- [docs/conversation_summary.md](../conversation_summary.md) — narrative history of the game mechanics (no AI content).

---

## Two advisors, one candidate set

Browslatro has **two independent advisors** that both answer the same question — *"which of these legal moves is best?"* — by returning an **index into an engine-vetted candidate list**. They never emit a raw move; they only ever pick from a list the engine already proved is legal.

| | **Prompted LLM advisor** | **ONNX policy advisor** |
| --- | --- | --- |
| What it is | [Claude](https://docs.anthropic.com/en/docs/intro-to-claude) (`claude-opus-4-8`) called per-request with a wiki-grounded prompt. | A small [multi-layer perceptron](https://en.wikipedia.org/wiki/Multilayer_perceptron) run **in the browser** via [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html). |
| Code | [`src/ai/advisor/`](../../src/ai/advisor/) (`requestAdvice`, `client.ts`, `handler.ts`). | [`src/ai/policy.ts`](../../src/ai/policy.ts), [`src/ai/encode.ts`](../../src/ai/encode.ts), model files in [`public/models/`](../../public/models/). |
| Surface in the UI | The **Suggest** buttons (shop / pack / blind) and the autopilot **move explanation** — produces a recommendation **plus a plain-language explanation, a tempting alternative, and a transferable concept**. | Ranks candidates for **autopilot** and pre-ranks the LLM's candidate list while Claude is still thinking. Fast, local, free, but explanation-free. |
| Cost / latency | Slow (25 s server timeout), [BYOK](https://en.wikipedia.org/wiki/Bring_your_own_device)-capable, rate-limited, costs money. | Instant, offline, free. |
| How it's built | Zero-shot — Claude already "knows" Balatro, grounded with retrieved wiki notes. | [Imitation learning](https://en.wikipedia.org/wiki/Imitation_learning): trained offline to copy a Monte-Carlo search expert + weighted human play. |
| Production model | `claude-opus-4-8` (overridable via `ADVISOR_MODEL`). | Hand: [`advisor-policy-v8.onnx`](../../public/models/advisor-policy-v8.onnx). Shop: [`advisor-shop-policy-v2.onnx`](../../public/models/advisor-shop-policy-v2.onnx). |

The two paths share the **same candidate enumeration** ([`getHandOptions`](../../src/ai/getHandOptions.ts)) and the **same state projection** ([`ModelState`](../../src/ai/modelState.ts)). That shared spine is what makes them interchangeable and comparable. See [engine-plumbing.md](./engine-plumbing.md).

---

## The engine ↔ LLM division of labor

The single most important design rule:

> **The engine owns legality and arithmetic; the model owns judgment and explanation. Numbers flow in exactly one direction: engine → prompt → explanation. The model never computes a score; it only ever quotes one the engine already computed.**

Concretely:

1. **The engine enumerates every legal move and scores it** with [`simulatePlay`](../../src/ai/simulatePlay.ts) — a deterministic re-implementation of the [scoring pipeline](../onboarding/scoring-pipeline.md). This produces `HandOption` candidates carrying their own `score`, `chips`, and `mult`.
2. **The model picks an index** into that list. Because it can only return an integer index (validated against the candidate count), it is **structurally incapable of suggesting an illegal move** — the classic "constrain the action space" safety pattern.
3. **The model's prose is fact-checked against the candidates.** The system prompt forbids inventing numbers (*"every chip, mult, score, or money figure you mention must appear verbatim in the provided data"*), and the engine-computed figures are the only numbers in the prompt.

This is why Browslatro chose a **prompted** advisor over a fine-tuned one for v1: the engine already guarantees correctness, so the LLM only needs to supply the *pedagogy* (why one legal move beats another), which a general model does well zero-shot. The trained ONNX policy is the complementary "fast and free" path for autopilot and pre-ranking. The full rationale lives in the design discussion for the umbrella issue (`#966`).

---

## One piece of advice, end to end

Here is the **complete lifecycle of a single "Suggest" click** in the shop. (Hand-play "explain my move" and blind/pack suggestions follow the same shape with different builders.)

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant UI as ShopSuggestion.tsx<br/>(useSuggestion hook)
    participant Plan as buildShopAdvicePlan<br/>(candidate assembly)
    participant ONNX as shopRanker<br/>(in-browser policy, optional pre-rank)
    participant Client as client.ts<br/>(fetchContextAdvice)
    participant API as /api/advice<br/>(Vercel function)
    participant Handler as handler.ts<br/>(validate + rate-limit)
    participant Model as model.ts<br/>(requestAdvice)
    participant Wiki as wiki.ts<br/>(exact-key retrieval)
    participant Claude as Anthropic Messages API<br/>(claude-opus-4-8)

    Player->>UI: clicks "Suggest a purchase"
    UI->>Plan: buildShopAdvicePlan(live ShopView)
    Plan-->>UI: { request: ShopAdviceRequest, actions[] } or null
    opt ONNX available
        UI->>ONNX: rankShop(candidates) (pre-rank for instant hint)
        ONNX-->>UI: candidate index order
    end
    UI->>Client: fetchContextAdvice(request)
    Client->>API: POST /api/advice (JSON body, optional x-advisor-key)
    API->>Handler: handleAdviceRequest(request)
    Handler->>Handler: method check, key resolve, rate-limit, size + schema validate
    Handler->>Model: requestAdvice(parsed, apiKey)
    Model->>Wiki: retrieveShopWikiEntries(jokers in shop + owned)
    Wiki-->>Model: WikiEntry[] (skip unknown keys)
    Model->>Model: buildShopMessage(state + candidates + wiki) + ADVICE_SCHEMA
    Model->>Claude: messages.create({ system, message, json_schema, thinking })
    Claude-->>Model: structured JSON (recommendationIndex, explanation, ...)
    Model->>Model: parseAdvice + isAdvice (index bounds, distinct alt)
    Model-->>Handler: { ok: true, advice }
    Handler-->>API: 200 { advice } or error { error: code }
    API-->>Client: HTTP response
    Client->>Client: validate isAdvice(advice, candidates.length)
    Client-->>UI: { ok: true, advice } or { ok: false, code }
    UI->>Player: render recommendation + alternative + concept<br/>(SuggestionAdvice.tsx); clicking applies actions[recommendationIndex]
```

Step by step, with the modules that own each step:

1. **Click → plan.** [`useSuggestion`](../../src/ai/advisor/useSuggestion.ts) runs the surface's `buildPlan()` — e.g. [`buildShopAdvicePlan`](../../src/ai/advisor/shopAdvicePlan.ts) — which snapshots the live shop into a `ShopAdviceRequest` (buy/reroll/leave candidates, capped at `MAX_CANDIDATES = 12`, requiring at least `MIN_CONTEXT_CANDIDATES = 2`) and a parallel list of UI `actions` to execute once the model answers. If there aren't enough candidates, it returns `null` and the button stays idle. See [llm-advisor.md](./llm-advisor.md#request-shapes).
2. **Optional instant pre-rank.** If the ONNX shop policy is loaded, [`shopRanker`](../../src/ai/advisor/shopRanker.ts) ranks the candidates locally so the UI can show a fast hint while Claude is still thinking. See [engine-plumbing.md](./engine-plumbing.md#shop-encoding-shopencodingts).
3. **Client fetch.** [`fetchContextAdvice`](../../src/ai/advisor/client.ts) POSTs the request JSON to `/api/advice` with a 30 s [`AbortSignal.timeout`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static), attaching the optional `x-advisor-key` [BYOK](#) header read from `localStorage`.
4. **Serverless entry.** [`api/advice.ts`](../../api/advice.ts) is a one-line [Vercel function](https://vercel.com/docs/functions) (`maxDuration = 30`) that delegates straight to `handleAdviceRequest`.
5. **Gatekeeping.** [`handler.ts`](../../src/ai/advisor/handler.ts) enforces POST-only, resolves the API key (player `x-advisor-key` header, else server `ANTHROPIC_API_KEY`), applies [rate limiting](./api-layer.md#rate-limiting) (skipped for BYOK), checks body size, and validates the request shape with `parseAdviceRequest`.
6. **Prompt assembly.** [`requestAdvice`](../../src/ai/advisor/model.ts) builds the per-context user message, injects retrieved [wiki](./wiki-retrieval.md) notes, attaches the [`ADVICE_SCHEMA`](./llm-advisor.md#structured-output-the-advice_schema) as a [JSON-schema structured output](https://docs.anthropic.com/en/docs/build-with-claude/tool-use), and calls the [Anthropic Messages API](https://docs.anthropic.com/en/api/messages) with [extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) and [prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) on the system block.
7. **Validate the answer.** The response JSON is parsed and checked by `isAdvice` — indices must be in range and the alternative must differ from the recommendation — before it's trusted.
8. **Map and return.** `handler.ts` maps success to `200 { advice }` and every failure to a typed `{ error: code }` with the right HTTP status (full table in [api-layer.md](./api-layer.md#error-codes)).
9. **Render.** Back in the browser, `client.ts` re-validates the advice shape, and [`SuggestionAdvice.tsx`](../../src/components/advisor/SuggestionAdvice.tsx) renders the recommendation, the tempting alternative + why it's worse, and the transferable concept. Applying the suggestion runs `actions[recommendationIndex]`.

---

## Core design decisions (and where they live)

- **Index-into-candidates, never free-form moves.** Prevents illegal-move hallucination by construction. ([`types.ts`](../../src/ai/advisor/types.ts), [`advice.ts`](../../src/ai/advisor/advice.ts))
- **Numbers flow one direction.** The engine is the only source of figures; the prompt forbids inventing them. ([`model.ts` system prompt](./llm-advisor.md#the-system-prompt))
- **One shared encoder, two languages.** [`src/ai/encode.ts`](../../src/ai/encode.ts) (TypeScript, runtime) and [`ml/encoding.py`](../../ml/encoding.py) (Python, training) must produce **byte-identical** 729-float vectors. They share an `ENCODING_VERSION` (currently `4`) and are pinned together by golden-vector tests. Any encoding change requires bumping the version on both sides and retraining. See [engine-plumbing.md](./engine-plumbing.md#encoding-syncing-two-encoders).
- **Lossy-on-purpose state projection.** [`ModelState`](../../src/ai/modelState.ts) hides face-down card identities (anti-cheat), collapses joker effects to a 5-category bucket, and omits consumables — deliberate scope choices documented in [engine-plumbing.md](./engine-plumbing.md#modelstate--the-deliberately-lossy-projection).
- **Deterministic simulation for candidate scoring.** [`simulatePlay`](../../src/ai/simulatePlay.ts) uses a fixed `neverProc` RNG so probabilistic jokers resolve to a reproducible floor rather than sampling. This is *not* identical to the live game's RNG-driven [`usePlayHand`](../../src/hooks/usePlayHand.ts); see the caveat in [engine-plumbing.md](./engine-plumbing.md#simulateplay-vs-the-real-game).
- **Graceful degradation everywhere.** No API key → `503 not_configured`; model unavailable → ONNX policy degrades to a greedy ranker; Redis down → in-memory rate limiter; unknown wiki key → silently skipped.
- **BYOK to bypass limits.** A player-supplied Anthropic key (stored only in their browser, sent as `x-advisor-key`) skips the shared rate limits. See [api-layer.md](./api-layer.md#secrets--byok).

---

## Future work (open threads)

These are **research/roadmap items, not shipped behavior.** Some have machinery already merged (scripts, training flags) but no production model selected.

- **LLM teacher distillation into the ONNX policy (`#1153`).** The offline machinery is merged — [`scripts/labelDisagreements.ts`](../../scripts/labelDisagreements.ts) relabels states where the policy disagrees with the search expert by calling `requestAdvice`, and [`ml/train.py`](../../ml/train.py) accepts `--teacher`/`--teacher-weight`. The *shipped* hand policy (`advisor-policy-v8`) is still imitation-learned from the search expert + human play; selecting and shipping a teacher-distilled hand model remains open.
- **LLM teacher for the shop policy (`#1338`).** Same idea for shop decisions, with a Claude Sonnet 4.6 teacher. The shipped `advisor-shop-policy-v2` is rollout-labeled, not teacher-distilled.
- **Value-guided search → single-agent self-play RL (`#1331`).** An [AlphaZero](https://en.wikipedia.org/wiki/AlphaZero)-adapted direction (single-player, stochastic, [chance nodes](https://en.wikipedia.org/wiki/Expectiminimax)). A Phase-1 experiment found the marginal value signal weak; not green-lit.
- **Wiki coverage expansion (`#1077`).** The exact-key wiki covers a curated subset of jokers/bosses; unknown keys degrade gracefully (no entry injected).

When any of these ship, move the corresponding paragraph into the relevant doc and update the production-model table above.
