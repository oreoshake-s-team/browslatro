# Running & Testing the Advisor Locally

How to exercise each piece of the advisor on your machine. The JS/TS side uses [Yarn (Berry)](https://yarnpkg.com/) with the `pnpm` nodeLinker; the [`ml/`](../../ml/) side is plain Python with its own [`requirements.txt`](../../ml/requirements.txt). See the repo [README](../../README.md) for first-time JS setup and [`ml/README.md`](../../ml/README.md) for the canonical ML workflow (this doc cross-links rather than duplicates it).

- [Environment variables](#environment-variables)
- [Unit tests](#unit-tests)
- [The API route in dev](#the-api-route-in-dev)
- [The headless loop, datasets & training](#the-headless-loop-datasets--training)
- [Benchmarking & evaluation](#benchmarking--evaluation)
- [Changing the encoding](#changing-the-encoding-the-ritual)

---

## Environment variables

| Var | Side | Needed for | Notes |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | server | the live LLM advisor, `labelDisagreements.ts` | **Server-only**; never put it in client/Vite env. Without it, `/api/advice` returns `503 not_configured`. |
| `ADVISOR_MODEL` | server | overriding the teacher/advisor model | default `claude-opus-4-8`. |
| `ADVISOR_THINKING` | server | disabling extended thinking | set `"none"` to turn off. |
| `ADVISOR_EFFORT` | server | dropping the effort hint | set `"none"` to turn off. |
| `UPSTASH_REDIS_REST_URL` / `KV_REST_API_URL` | server | durable (multi-instance) rate limiting | optional; falls back to in-memory. |
| `UPSTASH_REDIS_REST_TOKEN` / `KV_REST_API_TOKEN` | server | durable rate-limit auth | optional. |

See [api-layer.md](./api-layer.md#secrets--byok) for how each is consumed. For the live advisor in the browser you can also paste a **player key** (BYOK) into the in-app key form instead of configuring a server key — it's stored only in your browser and bypasses rate limits.

---

## Unit tests

The advisor has dense unit coverage — no key, network, or GPU required (the LLM client and ONNX session are stubbed/exercised on tiny fixtures).

```bash
yarn test                                   # full vitest suite (vitest run)
yarn test src/ai/advisor                    # just the advisor modules
yarn test src/ai/encode.test.ts             # the TS encoder golden-vector tests
yarn typecheck                              # strict tsc --noEmit

python3 -m unittest discover -s ml/tests    # the Python pipeline tests (stdlib only)
```

What the tests pin:

- **`src/ai/advisor/*.test.ts`** — request validation (`types`), the four message builders (`model.test.ts`), API request/response shaping (`model.request.test.ts`), the handler's gatekeeping + rate-limit + error mapping (`handler.test.ts`), the client's fetch/error mapping (`client.test.ts`), wiki retrieval (`wiki.test.ts`), the rate limiters (`rateLimit`, `durableRateLimit`), and the hooks (`useSuggestion`, `useMoveExplanation`).
- **`src/ai/encode.test.ts` ↔ `ml/tests/test_encoding.py`** — the two encoders agree on the 729-float layout. **Run both** after any encoding touch.
- **`src/ai/{simulatePlay,getHandOptions,policy,searchAgent,dataset,evaluateAgent}.test.ts`** — the engine plumbing and ML loop.

---

## The API route in dev

[`/api/advice`](../../api/advice.ts) is a [Vercel function](https://vercel.com/docs/functions), so a plain Vite dev server won't serve it. Use the [Vercel CLI](https://vercel.com/docs/cli) to run the frontend + function together:

```bash
# from the repo root, with ANTHROPIC_API_KEY exported (or use BYOK in the UI)
vercel dev
```

Then drive a real request from the browser (the Suggest buttons / autopilot) or with `curl` against the local function:

```bash
curl -s localhost:3000/api/advice \
  -H 'content-type: application/json' \
  -H 'x-advisor-key: sk-ant-...'   `# optional BYOK; omit to use the server key` \
  -d '{ "context": "blind", "blind": { ... }, "candidates": [ ... ] }'
```

You don't need the real Anthropic API to test the *handler* — `handler.test.ts` injects a fake `requestAdvice` via `AdviceHandlerDeps`, so every gate (method, key, rate limit, size, schema, error mapping) is covered offline.

---

## The headless loop, datasets & training

The headless engine needs no model or network — it's pure TS. Scripts run with [`tsx`](https://github.com/privatenumber/tsx) via `yarn dlx`. (Full step-by-step lives in [`ml/README.md`](../../ml/README.md).)

```bash
# 1. Generate a search-expert dataset (JSONL of hand decisions)
yarn dlx tsx scripts/generateDataset.ts dataset.jsonl --games 500 --joker-loadout-fraction 0.5

# 2. (optional) Generate rollout-labeled shop decisions
yarn dlx tsx scripts/generateShopRolloutDataset.ts shop.jsonl --games 200 --hand-model public/models/advisor-policy-v8.onnx

# 3. Train + export a new hand policy (Python; see ml/requirements.txt)
python3 ml/train.py dataset.jsonl --human ml/data/human-play/*.jsonl --out public/models/advisor-policy-v9.onnx

# 3b. Or train the shop policy
python3 ml/train.py shop.jsonl --shop --out public/models/advisor-shop-policy-v3.onnx
```

For LLM teacher labeling (costs money, needs `ANTHROPIC_API_KEY`):

```bash
yarn dlx tsx scripts/labelDisagreements.ts dataset.jsonl teacher.jsonl --model public/models/advisor-policy-v8.onnx --concurrency 2
python3 ml/train.py dataset.jsonl --teacher teacher.jsonl --teacher-weight 5 --out public/models/advisor-policy-v9.onnx
```

> Selecting/shipping a teacher-distilled model is open work (`#1153`/`#1338`) — see [ml-pipeline.md](./ml-pipeline.md#teacher-distillation-offline-machinery). The scripts and flags exist; the shipped models don't use teacher labels yet.

---

## Benchmarking & evaluation

```bash
# Outcome benchmark: candidate model(s) vs. greedy baseline, by avgBlinds
yarn dlx tsx scripts/benchmarkPolicy.ts public/models/advisor-policy-v9.onnx public/models/advisor-policy-v8.onnx --games 200

# Agreement with real human play (Python; needs onnxruntime)
python3 ml/evaluate_real_play.py public/models/advisor-policy-v8.onnx
python3 ml/evaluate_real_play.py --shop public/models/advisor-shop-policy-v2.onnx
```

**Ship only on a clear `avgBlinds` win** over the incumbent across disjoint seeds — never on validation accuracy alone (see the [validation-accuracy trap](./ml-pipeline.md#mldatasetpy--ingestion--weighting)). When you ship, commit the new `public/models/advisor-policy-v{N}.onnx` and point `ADVISOR_MODEL_URL` (in [`advisorRanker.ts`](../../src/ai/advisor/advisorRanker.ts)) — or `SHOP_MODEL_URL` in [`shopRanker.ts`](../../src/ai/advisor/shopRanker.ts) — at it.

---

## Changing the encoding (the ritual)

Because [two encoders must agree](./engine-plumbing.md#encoding-syncing-two-encoders), an encoding change is a fixed sequence:

1. Edit [`src/ai/encode.ts`](../../src/ai/encode.ts) **and** [`ml/encoding.py`](../../ml/encoding.py) identically.
2. Bump `ENCODING_VERSION` in **both** (currently `4`).
3. Regenerate golden fixtures and run **both** `yarn test src/ai/encode.test.ts` and `python3 -m unittest discover -s ml/tests`.
4. Retrain and export a new `advisor-policy-v{N+1}.onnx`, benchmark it, and only then repoint the model URL.

Skipping any step ships a model that sees different inputs than it was trained on — the failure is silent (no crash, just degraded suggestions), which is exactly why the version + golden-vector guards exist.
