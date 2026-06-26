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

> **Required data framework — real everything, never greedy.** Generate datasets from realistic shop-purchase-driven play (`--shop-policy`), **never** random joker loadouts (`--joker-loadout-fraction`) or greedy-agent-driven generation. Random loadouts fabricate off-distribution states that depress the outcome metric; the greedy agent is only the benchmark floor, never a data source or training target. Teacher labels must be regenerated on the same realistic dataset they train against. See [ml-pipeline.md](./ml-pipeline.md#required-data-framework--real-everything-never-greedy).

```bash
# 1. Generate a realistic search-expert dataset (shop-driven; NO --joker-loadout-fraction)
yarn dlx tsx scripts/generateDataset.ts dataset.jsonl --games 2000 --shop-policy public/models/advisor-shop-policy-v8.onnx

# 2. (optional) Generate rollout-labeled shop decisions
yarn dlx tsx scripts/generateShopRolloutDataset.ts shop.jsonl --games 200 --hand-model public/models/advisor-policy-v9.onnx

# 3. Train + export a new hand policy (Python; see ml/requirements.txt)
python3 ml/train.py dataset.jsonl --human ml/data/human-play/*.jsonl --out public/models/advisor-policy-v10.onnx

# 3b. Or train the shop policy (optionally folding in rollout-gated advice-feedback corrections)
yarn dlx tsx scripts/gateShopCorrections.ts ml/data/human-play/2026-06-15.jsonl gated.jsonl
python3 ml/train.py shop.jsonl --shop --corrections gated.jsonl --out public/models/advisor-shop-policy-v8.onnx
```

For LLM teacher labeling (costs money, needs `ANTHROPIC_API_KEY`):

```bash
yarn dlx tsx scripts/labelDisagreements.ts dataset.jsonl teacher.jsonl --model public/models/advisor-policy-v9.onnx --concurrency 2
python3 ml/train.py dataset.jsonl --teacher teacher.jsonl --teacher-weight 5 --out public/models/advisor-policy-v10.onnx
```

> The production hand policy `advisor-policy-v9` **is** teacher-distilled — trained on realistic shop-driven data with a distribution-matched LLM teacher (the teacher labels must come from the same realistic dataset, or they hurt). See [ml-pipeline.md](./ml-pipeline.md#teacher-distillation-offline-machinery).

---

## Benchmarking & evaluation

```bash
# Outcome benchmark: candidate model(s) vs. greedy baseline, by avgBlinds
yarn dlx tsx scripts/benchmarkPolicy.ts candidate.onnx public/models/advisor-policy-v9.onnx --games 200

# Agreement with real human play (Python; needs onnxruntime)
python3 ml/evaluate_real_play.py public/models/advisor-policy-v9.onnx
python3 ml/evaluate_real_play.py --shop public/models/advisor-shop-policy-v8.onnx
```

The benchmark prints a compact comparison table (`winRate`, `avgAnte`, `avgBlinds`, `avgHands`, `avgSkipped`) followed by a detailed per-agent block:

```
=== advisor-policy-v9.onnx ===
  wins 2/200 (1.0% ± 0.7%)  reachedFinalAnte 0
  ante      mean    3.10  sd   0.80  min   1.00  p25   2.00  med   3.00  p75   4.00  max   6.00
  blinds    mean    3.06  sd   1.41  min   0.00  p25   2.00  med   3.00  p75   4.00  max   8.00
  money     mean   42.30  sd  18.20  min   4.00  p25  28.00  med  40.00  p75  55.00  max 120.00
  shop      rerolls 0.30  jokers 1.20  consumables 0.80  vouchers 0.10  packsOpened 0.40  packPicks 0.50  spent 24.10
  lossesByAnte  a1:30  a2:48  a3:90  a4:30
```

`avgBlinds` is still the **only** ship gate, but read the rest to catch regressions the headline number hides — a wide `blinds` spread, a `lossesByAnte` wall at one ante, or **money piling up (`money.mean` high) while `packsOpened`/`packPicks` stay near zero**, which is the signature of the shop agent hoarding cash instead of opening packs.

**Ship only on a clear `avgBlinds` win** over the incumbent across disjoint seeds — never on validation accuracy alone (see the [validation-accuracy trap](./ml-pipeline.md#mldatasetpy--ingestion--weighting)). When you ship, commit the new `public/models/advisor-policy-v{N}.onnx` and point `ADVISOR_MODEL_URL` (in [`advisorRanker.ts`](../../src/ai/advisor/advisorRanker.ts)) — or `SHOP_MODEL_URL` in [`shopRanker.ts`](../../src/ai/advisor/shopRanker.ts) — at it.

---

## Changing the encoding (the ritual)

Because [two encoders must agree](./engine-plumbing.md#encoding-syncing-two-encoders), an encoding change is a fixed sequence:

1. Edit [`src/ai/encode.ts`](../../src/ai/encode.ts) **and** [`ml/encoding.py`](../../ml/encoding.py) identically.
2. Bump `ENCODING_VERSION` in **both** (currently `4`).
3. Regenerate golden fixtures and run **both** `yarn test src/ai/encode.test.ts` and `python3 -m unittest discover -s ml/tests`.
4. Retrain and export a new `advisor-policy-v{N+1}.onnx`, benchmark it, and only then repoint the model URL.

Skipping any step ships a model that sees different inputs than it was trained on — the failure is silent (no crash, just degraded suggestions), which is exactly why the version + golden-vector guards exist.
