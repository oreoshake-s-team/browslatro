# Engine Plumbing — Candidates, Simulation, State, Encoding

This is the deterministic, engine-owned half of the advisor: the code that turns a live game position into **a list of legal, scored candidate moves** and then into **a numeric feature vector** a neural network can rank. Both advisor paths ([prompted LLM](./llm-advisor.md) and [ONNX policy](./ml-pipeline.md)) sit on top of this layer.

Pipeline at a glance:

```
GameState / HeadlessRoundView
   │  getHandOptions(view, topN)
   ▼
HandOption[]  ── each candidate carries score/chips/mult from simulatePlay
   │  toModelState(view)
   ▼
ModelState    ── lossy, anti-cheat projection of the position
   │  encodeDecision(state, candidates)
   ▼
Float32Array[candidates × 729]  ── fed to the ONNX policy (or compared to the Python encoder)
```

- [`getHandOptions`](#gethandoptions--candidate-enumeration--pruning) — enumerate & prune candidates
- [`simulatePlay`](#simulateplay--deterministic-scoring) — deterministically score a play
- [`ModelState`](#modelstate--the-deliberately-lossy-projection) — project the position (and hide things)
- [`encode`](#encode--the-feature-vector) — build the 729-float feature matrix
- [Shop encoding](#shop-encoding-shopencodingts) — the separate 16-float shop/pack encoder

---

## `getHandOptions` — candidate enumeration & pruning

**File:** [`src/ai/getHandOptions.ts`](../../src/ai/getHandOptions.ts) · **Test:** `src/ai/getHandOptions.test.ts`

`getHandOptions(input: SimulatePlayInput, topN = DEFAULT_TOP_N): ReadonlyArray<HandOption>` is the **single source of the candidate list** both advisors choose from. A `HandOption` is a tagged union:

```ts
type HandOption = PlayOption | DiscardOption;

interface PlayOption {
  readonly action: "play";
  readonly cardIds: ReadonlyArray<number>;   // card identity is by numeric id, not value
  readonly handLabel: HandLabel;             // "Pair", "Flush", ... (see scoring-pipeline.md)
  readonly score: number;                    // from simulatePlay — engine-authoritative
  readonly chips: number;
  readonly mult: number;
  readonly notes: ReadonlyArray<HandOptionNote>;
}
interface DiscardOption {
  readonly action: "discard";
  readonly cardIds: ReadonlyArray<number>;
  readonly notes: ReadonlyArray<HandOptionNote>;
}
```

`HandOptionNote` is a small set of human/ML-legible annotations — `best-immediate-score`, `best-of-hand-type`, `commits-to-flush-build` (with the `suit`), `keeps-paired-ranks` (with the `ranks`). These notes are both shown to the LLM and one-hot-encoded for the policy (see [NOTE_KINDS](#encode--the-feature-vector)).

### Enumeration

A legal [Balatro](https://balatrowiki.org/) play is any subset of **1–5 cards** from the hand (`MAX_PLAYED_CARDS = 5`). `getHandOptions` enumerates these subsets with a `combinations()` generator and scores each:

- **Fast path** (`fastBestPlayPerLabel`): when there are **no jokers and it is not a boss round**, scoring is a closed-form hand-level calculation (`fastScore`), with a single `simulatePlay` call to finalize the winning subset per label. This avoids running the full scoring engine thousands of times.
- **Full path** (`bestPlayPerLabel`): when jokers are present or it's a [boss blind](https://balatrowiki.org/w/Blinds#Boss_Blinds), every subset is run through [`simulatePlay`](#simulateplay--deterministic-scoring), and boss-voided hands (e.g. The Mouth locking a hand type) are filtered out.

### Pruning (this is what keeps the candidate set small)

1. **One play per hand label.** Results are keyed in a `Map<HandLabel, PlayOption>`, so the output contains at most one candidate per poker hand type — the best-scoring subset that makes that hand.
2. **Top-N by score.** The plays are sorted by `score` descending and sliced to `topN` (`DEFAULT_TOP_N = 5`; the [policy agent](./ml-pipeline.md#policyagentts) uses `topN = 3`).
3. **Face-down exclusion.** Face-down cards (which the player can't legally play) are filtered from candidate subsets.
4. **Heuristic discards, deduped.** Two strategic discards are appended when applicable: a **flush-build** discard (drop off-suit cards when 3–4 of a suit are present) and a **paired-ranks** discard (drop singletons to keep pairs). Discards are deduplicated by their card-id set.

The first play gets the `best-immediate-score` note; the rest get `best-of-hand-type`. This bounded, annotated list (typically ≤ ~8 entries) is what the model ranks — and the cap is *why* the model only ever needs to return a small integer index.

---

## `simulatePlay` — deterministic scoring

**File:** [`src/ai/simulatePlay.ts`](../../src/ai/simulatePlay.ts) · **Test:** `src/ai/simulatePlay.test.ts`

`simulatePlay(input: SimulatePlayInput, cardIds): SimulatePlayResult` computes the **exact score of one play** by running the full Browslatro scoring formula headlessly — no UI, no animation, no state mutation. It is the engine's "what would this move be worth?" oracle, and the per-candidate `score`/`chips`/`mult` in `getHandOptions` come straight from it.

`SimulatePlayInput` (lines ~47–73) is the complete position needed to score: the dealt hand + remaining deck, the base deck and per-card mutation maps (`cardEnhancementsById`, `cardSealsById`, destroyed/added cards), the `jokers`, the `handStats` (current per-hand-type chip/mult levels), round/ante context, owned vouchers, the current `blind`/`currentBoss`, money, remaining hands/discards, and a few special-joker targets (`idolTarget`, `ancientSuit`, `todoHand`).

`SimulatePlayResult` is either `{ legal: false, reason }` or `{ legal: true, handLabel, score, chips, mult, scoringCardIds, bossTriggered }`.

The computation mirrors [docs/onboarding/scoring-pipeline.md](../onboarding/scoring-pipeline.md): detect the hand label, apply boss effects (hand voids, forced card counts, debuffs), pull the base `chips`/`mult` for that label, apply per-card joker effects, card [enhancements](https://balatrowiki.org/w/Enhancements)/[seals](https://balatrowiki.org/w/Seals)/[editions](https://balatrowiki.org/w/Editions), steel-held and X-mult multipliers, and finally `score = floor(chips * mult)`.

### `simulatePlay` vs. the real game

> **`simulatePlay` is deliberately *not* byte-identical to the live game.** Two differences matter:

1. **Deterministic RNG.** Probabilistic effects use a fixed `neverProc: RandomSource = () => 1`. Because the game's chance checks fire when `rng() < chance` and every `chance` is `< 1`, a value of `1` means probabilistic jokers (Lucky Cards, etc.) take their **non-triggering** branch. So `simulatePlay` returns a reproducible **lower bound** on RNG-dependent plays, not an expectation. This keeps candidate scoring deterministic and seed-free.
2. **No side effects.** The live hooks [`usePlayHand`](../../src/hooks/usePlayHand.ts) + `useScoringPipeline` drive animations, persist joker counter state, and resolve actual RNG. `simulatePlay` is a pure function and persists nothing. The two scoring paths are independent re-implementations and can drift; the [scoring-pipeline doc](../onboarding/scoring-pipeline.md) is the shared spec they both target.

`simulatePlay` is also the workhorse of the [Monte-Carlo search expert](./ml-pipeline.md#searchagentts--the-monte-carlo-expert) and the [headless run loop](./ml-pipeline.md#headlessrunts--the-headless-game-loop).

---

## `ModelState` — the deliberately lossy projection

**File:** [`src/ai/modelState.ts`](../../src/ai/modelState.ts) · **Test:** `src/ai/modelState.test.ts`

`toModelState(input): ModelState` projects a live position into the **only** state shape the models ever see. It is intentionally lossy, and the omissions are the interesting part:

```ts
interface ModelState {
  readonly hand: ReadonlyArray<ModelHandCard>;   // ModelCard | ModelFaceDownCard
  readonly jokers: ReadonlyArray<ModelJoker>;
  readonly blind: ModelBlind;                    // boss details only on boss rounds
  readonly ante: number;
  readonly round: number;
  readonly stake: Stake;
  readonly money: number;
  readonly remainingHands: number;
  readonly remainingDiscards: number;
  readonly roundScore: number;
  readonly deckId: Deck;
  readonly deck: ModelDeckComposition;           // counts of unseen cards by suit & rank
}
```

What it **deliberately drops or hides**:

- **Face-down card identity (anti-cheat).** A `ModelFaceDownCard` exposes only `{ id, faceDown: true }` — never its rank/suit. The model cannot "see" cards the player can't.
- **Joker effect parameters.** A `ModelJoker` keeps `effectKind` (the discriminant string) plus rarity, edition, stickers (kinds only), and a `counter` value — **not** the full `effect` object with its amounts. The encoder further collapses `effectKind` into [five categories](#encode--the-feature-vector). The 150-joker [discriminated union](../onboarding/jokers-and-content.md) is far too wide to one-hot, so it's bucketed.
- **Consumables.** [Tarot](https://balatrowiki.org/w/Tarot_Cards)/[planet](https://balatrowiki.org/w/Planet_Cards)/[spectral](https://balatrowiki.org/w/Spectral_Cards) cards in hand affect future scoring but are **not** in `ModelState`.
- **Deck composition is a histogram, not a list.** `ModelDeckComposition` is `{ total, bySuit, byRank }` over the unseen cards — counts, not identities.

These choices keep the input compact and fixed-width, and they encode the product decision that the advisor reasons about *the current decision*, not hidden information.

---

## `encode` — the feature vector

**File:** [`src/ai/encode.ts`](../../src/ai/encode.ts) · **Test:** `src/ai/encode.test.ts`

`encodeDecision(state, candidates): Float32Array` produces the matrix the ONNX policy consumes: **one row per candidate**, each row being `[...encodeState(state), ...encodeCandidate(candidate, state)]`. Every value is a normalized float (counts divided by caps, [one-hot](https://en.wikipedia.org/wiki/One-hot) vectors, [`log1p`](https://en.wikipedia.org/wiki/Natural_logarithm)-scaled scores).

### Exact dimensionality (verified)

`ENCODING_VERSION = 4`. All widths are computed from constant vocabularies, so the numbers below are exact:

| Constant | Formula | Value |
| --- | --- | --- |
| `CARD_FEATURES` | `2 + ranks(13) + suits(4) + enh(8) + seals(4) + editions(3) + 1` | **35** |
| `HAND_SLOTS` | fixed | **16** (hand padded/truncated to 16 card slots) |
| `CONTEXT_FEATURES` | `6 + blindKinds(3) + 1 + suits(4) + ranks(13) + decks(15) + stakes(8) + 5 + 1` | **56** |
| `JOKER_SLOT_FEATURES` | `1 + effectCats(5) + rarities(4) + jokerEditions(4) + 1` | **15** |
| `JOKER_SLOTS` | fixed | **5** |
| `JOKER_FEATURES` | `5 × 15` | **75** |
| `STATE_FEATURES` | `16×35 + 56 + 75` | **691** |
| `CANDIDATE_FEATURES` | `2 + 16 + handLabels(13) + 3 + noteKinds(4)` | **38** |
| **`INPUT_FEATURES`** | `691 + 38` | **729** |

- **Per-card slot (35):** `[presence, faceDown, rank(13), suit(4), enhancement(8), seal(4), edition(3), bonusChips/100]`. Empty slots are all-zero; a face-down card is `[1, 1, 0…]` (present, hidden, no features) — the encoding mirrors the [anti-cheat projection](#modelstate--the-deliberately-lossy-projection).
- **Context (56):** money/hands/discards/score-progress (normalized), ante, round, blind-kind one-hot, deck total + suit/rank histograms, deck-id one-hot (15 decks), stake one-hot (8 stakes), plus 5 **deck-derived** and 1 **stake-derived** feature (e.g. starting-hand/discard/joker-slot deltas baked in, so the model doesn't have to memorize per-deck rules).
- **Per-joker slot (15):** `[presence, effectCategory(5), rarity(4), edition(4), min(counter/50, 1)]`. The five effect categories are `mult, x-mult, retrigger, money, passive`.
- **Per-candidate (38):** `[isPlay, isDiscard, handMask(16), handLabel(13), score3, notes(4)]`, where `handMask` flags which of the 16 hand slots this candidate uses, and `score3` is `[log1p(score)/log1p(target) capped, log1p(chips)/10, log1p(mult)/10]` for plays (all-zero for discards).

### Encoding: syncing two encoders

The TypeScript encoder ([`src/ai/encode.ts`](../../src/ai/encode.ts)) runs **at inference time in the browser**; the Python encoder ([`ml/encoding.py`](../../ml/encoding.py)) runs **at training time**. They must emit **byte-identical** vectors or the model sees different inputs than it was trained on. They stay in lockstep via:

1. **A shared `ENCODING_VERSION` (`4`)** asserted in both files, with a doc-comment instructing you to bump it on any change.
2. **Identical constant vocabularies** — the `RANKS`/`SUITS`/`ENHANCEMENTS`/`DECKS`/`STAKES`/`HAND_LABELS`/`NOTE_KINDS`/`JOKER_*` lists are duplicated verbatim in both languages and the width formulas are the same expressions.
3. **Golden-vector tests.** `encode.test.ts` (TS) and `ml/tests/test_encoding.py` (Python) assert that fixture records encode to vectors of length `INPUT_FEATURES` (729) and match expected slot positions.

> **Changing the encoding is a four-step ritual:** edit both encoders identically → bump `ENCODING_VERSION` in both → regenerate golden fixtures → retrain and re-export a new `advisor-policy-v{N+1}.onnx`. The ONNX file name's version tracks the policy, not the encoding (e.g. policy v8 uses encoding v4).

---

## Shop encoding (`shopEncoding.ts`)

**File:** [`src/ai/advisor/shopEncoding.ts`](../../src/ai/advisor/shopEncoding.ts) · mirrored by `ml/encoding.py` shop section (`SHOP_ENCODING_VERSION = 4`)

Shop and pack decisions use a **separate, much smaller encoder** because the action space is different (buy item / reroll / leave / pick / skip rather than play/discard subsets).

- `SHOP_INPUT_FEATURES = 96` = 36 context + 60 candidate.
- **Context (36):** `money/20, ante/8, round/24, picks/5`, then a **build-state block (32)** so the policy can rank an offer *against the engine it already owns*: per-hand-type levels (13), owned-joker count (1), a joker rarity histogram (4), a joker effect-category histogram (`mult/x-mult/retrigger/money/passive`, 5), consumables held (1), and a per-enhancement-type deck-enhancement histogram (`bonus/mult/wild/glass/steel/stone/gold/lucky`, 8). The build summary is computed by `shopBuildSummary` from the live `ShopView` at inference and carried on the record snapshots at training time (`handLevels` / `jokers` / `deckEnhancements` / `consumablesHeld`), read back verbatim in `encoding.py`.
- **Candidate (60):** a 7-way one-hot over item types `[joker, planet, tarot, spectral, playing-card, pack, voucher]`, plus `cost/20`, an affordability flag (`cost ≤ money`), `is-reroll`/`is-leave`/`is-skip` flags, a 12-way one-hot over **effect categories** (`joker-mult/x-mult/retrigger/money/passive`, `planet`, `tarot-enhance/economy/create/deck`, `spectral`, `other`), an 18-value **descriptive attribute vector** (normalized effect magnitudes, target/retrigger counts, planet chip/mult deltas, rarity, and scaling/create/destroy family flags) for cards, and an 18-value **voucher feature vector** so the policy can tell a voucher from a generic buy and one voucher from another. The voucher block is all-zero for non-voucher candidates and, for vouchers, carries normalized signals derived from the [`vouchers.ts`](../../src/items/vouchers.ts) helpers (extra shop slots, shop discount, consumable/joker slots, reroll-cost and interest-cap deltas, hands/discards/hand-size deltas, edition and tarot/planet shop-frequency multipliers, boss-reroll allowance, observatory, telescope). Card category and attributes are computed by [`shopCategory.ts`](../../src/ai/advisor/shopCategory.ts) and [`shopCandidateAttributes.ts`](../../src/ai/advisor/shopCandidateAttributes.ts); the voucher block by [`voucherFeatures.ts`](../../src/ai/advisor/voucherFeatures.ts). All three are carried on the record snapshots and read back verbatim in `encoding.py` (no Python catalog lookup).

`encodeShopCandidatesV2` / `encodePackCandidatesV2` flatten the candidates into a `Float32Array` for the [shop ONNX policy](./ml-pipeline.md#the-shop-policy). The shipped shop model is [`advisor-shop-policy-v13.onnx`](../../public/models/advisor-shop-policy-v13.onnx) (`SHOP_MODEL_URL` in [`shopRanker.ts`](../../src/ai/advisor/shopRanker.ts)), a use-aware, voucher-aware 97-feature policy.

---

## How the policy ranks (the ONNX side)

**File:** [`src/ai/policy.ts`](../../src/ai/policy.ts) · **Test:** `src/ai/policy.test.ts`

`policy.ts` turns the encoded matrix into a ranking:

- `loadPolicyRanker(model, onProgress)` — accepts a URL **or** a `Uint8Array`, creates an [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) `InferenceSession`, and on `rank()` feeds the `[candidates × 729]` tensor named **`candidates`**, reads the output named **`logits`**, and returns candidate indices sorted by logit descending. (Those node names match the [ONNX export](./ml-pipeline.md#onnx-export) in `train.py`.)
- `greedyRanker()` — a model-free baseline that simply orders plays-before-discards, plays by score. It exists **only** as the evaluation benchmark floor, never as a decision path or fallback.
- `createAdvisorRanker(model)` — a wrapper that lazily loads the ONNX policy and **fails fast**: if the model cannot load (or a decision cannot be encoded), `load()`/`rank()` reject and the caller surfaces a clear error. It never degrades to greedy rankings. The hand policy URL is `ADVISOR_MODEL_URL = "/models/advisor-policy-v9.onnx"` in [`advisorRanker.ts`](../../src/ai/advisor/advisorRanker.ts). The consuming hook ([`useAutopilot`](../../src/hooks/useAutopilot.ts)) catches the rejection, announces an "advisor unavailable" error, and auto-disables autopilot.

> **Greedy is an anti-pattern — there is no fallback to extend.** Per `CLAUDE.md` ([Greedy algorithms are an anti-pattern](../../CLAUDE.md#greedy-algorithms-are-an-anti-pattern)), new code must **never** add a greedy fallback. When a model or service is unavailable, **fail fast** with a clear error rather than silently serving greedy results that masquerade as correct. The only sanctioned use of `greedyRanker` / `createGreedyAgent` is as the benchmark floor in evaluation — fenced by `src/ai/greedyUsage.guard.test.ts`, whose allowlist must not be widened.

This ranker is consumed by the [policy agent](./ml-pipeline.md#policyagentts) (headless/autopilot) and by the UI hooks as an instant pre-rank while the LLM is thinking.
