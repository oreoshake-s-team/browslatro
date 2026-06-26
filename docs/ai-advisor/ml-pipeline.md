# The ML Pipeline — Headless Play, Datasets, Training, Evaluation

This is the **offline** half of the system: how the [ONNX policy](./engine-plumbing.md#how-the-policy-ranks-the-onnx-side) that powers autopilot and candidate pre-ranking gets *made*. The shipped hand policy is an [imitation-learning](https://en.wikipedia.org/wiki/Imitation_learning) student: it's trained to copy a [Monte-Carlo](https://en.wikipedia.org/wiki/Monte_Carlo_method) search expert (plus weighted human play and a distribution-matched [LLM teacher](#teacher-distillation-offline-machinery)), then exported to [ONNX](https://onnx.ai/) for fast in-browser inference. All of this rides on the [required data framework](#required-data-framework--real-everything-never-greedy): real (shop-driven) data everywhere, never greedy or random-loadout shortcuts.

The loop:

```
headless self-play (search expert)            human play (UI capture)
        │  records (state, candidates, chosen)         │  records (same schema)
        └───────────────┬──────────────────────────────┘
                        ▼  JSONL dataset
              ml/train.py (PyTorch MLP, listwise cross-entropy)
                        ▼  torch.onnx.export
              public/models/advisor-policy-v{N}.onnx
                        ▼
              benchmark vs. greedy → ship if it wins
```

- [`headlessRun.ts`](#headlessrunts--the-headless-game-loop) — the engine that plays games without a UI
- [`searchAgent.ts`](#searchagentts--the-monte-carlo-expert) — the expert that generates labels
- [`dataset.ts`](#datasetts--generating-training-records) + the record schema
- [Human play capture](#human-play-capture)
- [`ml/train.py`](#mltrainpy--training--export) — the PyTorch trainer + ONNX export
- [`ml/dataset.py`](#mldatasetpy--ingestion--weighting) — ingestion & weighting
- [Evaluation](#evaluation--is-the-new-model-better)
- [The shop policy](#the-shop-policy)
- [Teacher distillation (offline machinery)](#teacher-distillation-offline-machinery)
- [Scripts reference](#scripts-reference)

---

## Required data framework — real everything, never greedy

**This is a hard requirement for every advisor-policy dataset, teacher-labeling, and evaluation run.** Train and evaluate on the distribution the advisor actually faces in play; never substitute synthetic shortcuts.

- **Datasets come from realistic shop-purchase-driven play.** Generate with `generateDataset.ts --shop-policy <shop.onnx>` so jokers, money, and hand-levels grow only through real shop purchases between rounds (the search expert plays; the shop agent buys). The joint distribution of jokers + economy + hand-levels then matches real games.
- **Never use random joker loadouts.** `--joker-loadout-fraction` fabricates incoherent positions (joker combos / economies that never co-occur in play). A policy trained on them wastes capacity ranking states it will never see, and the outcome metric (`avgBlinds`) suffers even while validation accuracy looks fine. Empirically, switching from random loadouts to shop-driven data lifted the no-teacher baseline by ~+0.5 `avgBlinds`, and scaling random-loadout data did **not** help.
- **Never train on greedy-driven data, and never treat greedy as a target.** The [greedy agent](#policyagentts) exists **only** as the benchmark floor. It is not a data source, not a label source, and not a training target. This is a specific case of the project-wide rule that [greedy algorithms are an anti-pattern](../../CLAUDE.md#greedy-algorithms-are-an-anti-pattern): the benchmark floor is the *single* sanctioned use, never a decision path or fallback.
- **Teacher labels must match the training distribution.** Regenerate LLM-teacher labels (`scripts/labelDisagreements.ts`) on the *same realistic dataset* they will train against. A teacher distilled from off-distribution states (e.g. random loadouts) actively **hurts** a realistically-trained model; a distribution-matched teacher adds a consistent ~+0.2 `avgBlinds`.
- **Human play (`--human`) is realistic by construction** — it's captured from real games — so it always belongs in the mix.

The production hand policy [`advisor-policy-v9`](../../public/models/advisor-policy-v9.onnx) was produced exactly this way: ~20k realistic shop-driven games + weighted human play + a distribution-matched LLM teacher. It benchmarks on par with the prior `advisor-policy-v8` (within noise on `avgBlinds`) while being trained on the correct distribution.

---

## `headlessRun.ts` — the headless game loop

**File:** [`src/ai/headlessRun.ts`](../../src/ai/headlessRun.ts) · **Test:** `src/ai/headlessRun.test.ts`

`playHeadlessRun(agent, config)` plays a full game — antes 1..N, three blinds each, shop between rounds — with **no React and no UI**, driving everything through a single seeded RNG (`seededRng`, an [xorshift](https://en.wikipedia.org/wiki/Xorshift) PRNG) for perfect reproducibility. This is the substrate for both dataset generation and evaluation.

The agent interface is tiny:

```ts
interface HeadlessAgent {
  readonly name: string;
  chooseAction(view: HeadlessRoundView): AgentAction | Promise<AgentAction>;
}
type AgentAction =
  | { kind: "play"; cardIds: ReadonlyArray<number> }
  | { kind: "discard"; cardIds: ReadonlyArray<number> }
  | { kind: "skip" };
```

`HeadlessRoundView extends SimulatePlayInput` (so `getHandOptions`/`simulatePlay` work directly on it) plus `ante`, `round`, `scoreTarget`, `blind`, `stake`, `deck`. Each blind: deal a hand, repeatedly ask the agent for an action, [`simulatePlay`](./engine-plumbing.md#simulateplay--deterministic-scoring) each play to accumulate `roundScore`, refill, and stop when the target is met or hands run out. Between rounds an optional `shopAgent.buyAfterRound(view)` runs (see [the shop policy](#the-shop-policy)). The result is `HeadlessRunResult { won, anteReached, blindsCleared, handsPlayed, blindsSkipped }`.

### Resumable seams (why this enables search & rollouts)

`HeadlessRunConfig` exposes **checkpoint seams** that let a run *start from an arbitrary mid-game position*:

`startAnte`, `startMoney`, `startHandStats` (per-hand-type levels), and `startCardEnhancements` / `startCardSeals` / `startCardEditions` / `startCardBonusChips` (per-card mutation maps), plus `jokers`, `deck`, `stake`, `maxAnte`.

These are exactly what a [lookahead](https://en.wikipedia.org/wiki/Lookahead) planner needs: to evaluate "what is this shop purchase worth?", the [shop rollout expert](#the-shop-policy) resumes a run from `startAnte: ante+1` with the post-purchase jokers/money/handStats and measures how far it gets. The seams turn the headless engine into a resettable simulator — the prerequisite for any search-based method (and for a future [AlphaZero-style](https://en.wikipedia.org/wiki/AlphaZero) MCTS, tracked in `#1331`).

---

## `searchAgent.ts` — the Monte-Carlo expert

**File:** [`src/ai/searchAgent.ts`](../../src/ai/searchAgent.ts) · **Test:** `src/ai/searchAgent.test.ts`

The expert that produces training labels is a [Monte-Carlo](https://en.wikipedia.org/wiki/Monte_Carlo_tree_search) rollout planner — *not* a neural net. `createSearchAgent({ rng, rollouts, topN })`:

1. Gets the top-`topN` candidates (`DEFAULT_TOP_N = 3`) from [`getHandOptions`](./engine-plumbing.md#gethandoptions--candidate-enumeration--pruning).
2. For each candidate, runs `rollouts` (`DEFAULT_ROLLOUTS = 4`) simulations: shuffle the **unseen** cards (`withShuffledUnseen` — it can't see what the player can't), apply the candidate action, then play out the rest of the blind **greedily** until cleared or stuck.
3. Scores each rollout — `1 + remainingHands * 0.01` if the blind was cleared (rewarding clearing with hands to spare), else `roundScore / scoreTarget` (partial credit) — and averages over the rollouts.
4. Returns the action with the highest average value.

It handles hidden information (shuffled unseen cards) and the stochastic future (multiple rollouts), which is why its choices are a better training target than the immediate-best-score greedy baseline.

---

## `dataset.ts` — generating training records

**File:** [`src/ai/dataset.ts`](../../src/ai/dataset.ts) · **Test:** `src/ai/dataset.test.ts`

`generateDataset(config)` runs the search expert through many headless games and **records every hand decision**. It wraps the expert in a recorder that, on each decision, stores the candidates, which one the expert chose, and the full state. The output line schema (`DATASET_SCHEMA_VERSION = 1`):

```ts
interface DatasetRecord {
  readonly schemaVersion: 1;
  readonly runSeed: number;          // for deterministic train/val splitting
  readonly ante: number;
  readonly blind: Blind;
  readonly state: ModelState;        // the lossy projection (engine-plumbing.md)
  readonly candidates: ReadonlyArray<HandOption>;
  readonly chosenIndex: number;      // the expert's pick — the training label
  readonly chosenAction: AgentAction;
}
```

`config` controls volume and variety: `games`, `seedOffset`, the expert's `rollouts`/`topN`, `maxAnte`, an optional fixed `jokers` loadout or a `jokerLoadoutFraction` to sample random loadouts (so the dataset covers joker-rich states), `deck`, `stake`, and an optional `shopAgent`. Records serialize to [JSONL](https://jsonlines.org/) (`serializeDatasetRecords`). The `chosenIndex` here is exactly the `recommendationIndex` shape the [LLM advisor](./llm-advisor.md#structured-output-the-advice_schema) emits — which is what makes LLM-as-teacher possible.

---

## Human play capture

Real human games are captured in the same schema and mixed in at a higher weight, so the policy learns from actual play, not only the synthetic expert.

- [`humanPlay.ts`](../../src/ai/humanPlay.ts) — `recordHumanDecision(input, action, seed, topN)` turns a live decision into a `DatasetRecord`: it computes the candidates with `getHandOptions`, finds the index matching the human's action, and (if the human played something outside the top-N) appends that action as an extra candidate so the label is always representable.
- [`humanPlayLog.ts`](../../src/ai/humanPlayLog.ts) — a `localStorage`-backed ring buffer (`HUMAN_PLAY_LOG_KEY`, `MAX_LOG_RECORDS = 500`) holding both `DatasetRecord`s (hand decisions) and `RunEventRecord`s (shop/pack/etc.), with a `toJsonl()` exporter.
- [`humanPlayWiring.ts`](../../src/ai/humanPlayWiring.ts) — `captureHumanDecision(state, action)` / `captureRunEvent(state, event)` are called from the game's action handlers to log decisions in real time (suppressible for tests/replays).
- [`runEvents.ts`](../../src/ai/runEvents.ts) — the structured shop/pack/consumable/sell/skip event records (`RUN_EVENT_SCHEMA_VERSION = 2`: `PurchaseEvent`, `RerollEvent`, `PackPickEvent`, `ConsumableUseEvent`, `JokerSellEvent`, `BlindSkipEvent`). These feed the **shop** policy, whose decisions aren't hand plays.

Exported human-play JSONL lives under [`ml/data/human-play/`](../../ml/data/) (dated files) and is fed to training via `--human`.

---

## `ml/train.py` — training & export

**File:** [`ml/train.py`](../../ml/train.py) · **Run:** `python ml/train.py <dataset.jsonl> [...] [flags]`

### Model: `CandidateScorer`

A tiny 3-layer [MLP](https://en.wikipedia.org/wiki/Multilayer_perceptron) that scores **one candidate vector → one scalar logit**:

```python
nn.Sequential(
    nn.Linear(input_features, hidden),   # default hidden = 128
    nn.ReLU(),                           # https://en.wikipedia.org/wiki/Rectifier_(neural_networks)
    nn.Linear(hidden, hidden // 2),
    nn.ReLU(),
    nn.Linear(hidden // 2, 1),
)
# forward(candidates) → logits, shape [n] (one per candidate)
```

`input_features` is `729` for hand decisions (the [`INPUT_FEATURES`](./engine-plumbing.md#exact-dimensionality-verified)) or `16` for shop decisions.

### Loss: listwise softmax cross-entropy

A decision is *which of N candidates the expert chose*. So the loss is a [softmax](https://en.wikipedia.org/wiki/Softmax_function) [cross-entropy](https://en.wikipedia.org/wiki/Cross-entropy) over the whole candidate set, weighted per decision:

```python
def decision_loss(model, decision):
    inputs, chosen, weight = decision
    logits = model(torch.tensor(inputs, dtype=torch.float32))
    return weight * nn.functional.cross_entropy(logits.unsqueeze(0), torch.tensor([chosen]))
```

This is a [learning-to-rank](https://en.wikipedia.org/wiki/Learning_to_rank) objective: push the chosen candidate's logit above the others. The same logits, sorted descending at inference time, are the ranking [`policy.ts`](./engine-plumbing.md#how-the-policy-ranks-the-onnx-side) consumes.

### Optimization

[Adam](https://arxiv.org/abs/1412.6980) (`lr` default `1e-3`), `epochs` default `30`, one gradient step per decision (no minibatching), training list reshuffled each epoch. It prints per-epoch loss and validation accuracy (top-1 agreement with the held-out expert labels).

### ONNX export

```python
torch.onnx.export(
    model, (example,), args.out,
    input_names=["candidates"], output_names=["logits"],
    dynamic_axes={"candidates": {0: "n"}, "logits": {0: "n"}},   # variable candidate count
    opset_version=18, external_data=False,
)
```

The node names `candidates`/`logits` and the dynamic batch axis are **exactly what [`policy.ts`](./engine-plumbing.md#how-the-policy-ranks-the-onnx-side) feeds and reads** at inference. Output file is the next `advisor-policy-v{N}.onnx`.

### CLI flags

| Flag | Default | Purpose |
| --- | --- | --- |
| `datasets` (positional, 1+) | — | search-expert JSONL files |
| `--human` (repeatable) | — | human-play JSONL (trained, never held out) |
| `--human-weight` | `5.0` | weight on human decisions |
| `--teacher` (repeatable) | — | LLM-teacher JSONL (trained, never held out) — see [distillation](#teacher-distillation-offline-machinery) |
| `--teacher-weight` | `5.0` | weight on teacher decisions |
| `--corrections` (repeatable) | — | human-play JSONL; quality-gated `advice-feedback` corrections train as weighted labels |
| `--corrections-weight` | `5.0` | weight on corrections |
| `--min-score-fraction` | `0.25` | quality gate: a corrected hand play must score at least this fraction of the best play. Shop corrections have no per-candidate score, so they are gated separately by [`scripts/gateShopCorrections.ts`](../../scripts/gateShopCorrections.ts) (rollout-based) before `--shop --corrections`. |
| `--shop` | off | train the build-aware (78-feature) shop policy instead of the hand policy |
| `--epochs` | `30` | training epochs |
| `--hidden` | `128` | hidden width |
| `--lr` | `1e-3` | Adam learning rate |
| `--seed` | `0` | RNG seed |
| `--out` | auto | output ONNX path |

Human and teacher sources are weighted **independently** of the generated data and are always trained (never held out for validation), because they're the high-value signal.

---

## `ml/dataset.py` — ingestion & weighting

**File:** [`ml/dataset.py`](../../ml/dataset.py) · **Test:** `ml/tests/test_dataset.py`

Turns JSONL into `(candidate_vectors, chosen_index, weight)` training tuples via [`ml/encoding.py`](./engine-plumbing.md#encode--the-feature-vector) (the Python twin of the TS encoder). Highlights:

- **`load_decisions` / `load_all`** — parse hand records, skip `chosenIndex == -1` (expert action not in candidates) and hands wider than `HAND_SLOTS` (16, unencodable), apply a uniform `weight`.
- **`split_by_seed(decisions, validation_fraction=0.2)`** — a **deterministic train/val split keyed on `runSeed`**, not on individual records. Two decisions from the same game are highly correlated, so splitting by seed prevents [leakage](https://en.wikipedia.org/wiki/Leakage_(machine_learning)) that would inflate validation accuracy.
- **`build_training_set`** — combines the generated train split with the `--human` and `--teacher` sources at their own weights.
- **Shop split (`load_shop_decisions_split`)** — partitions shop records into rollout-labeled (subject to train/val split, weight 1.0) vs. `teacherLabeled` (always trained at `teacher_weight`).

`DATASET_SCHEMA_VERSION = 1` (hand), `SHOP_SCHEMA_VERSION = 2` (shop/pack).

> **Validation accuracy is a trap for teacher labels.** The default metric measures agreement with the search expert. But teacher labels exist *precisely because* they disagree with the expert — so on a teacher-distilled model, expert-agreement will (correctly) drop. The right success signal is the [outcome benchmark](#evaluation--is-the-new-model-better), not validation accuracy. This subtlety is the heart of the open distillation work (`#1153`).

---

## Evaluation — is the new model better?

Two complementary evaluators, both built on the [headless loop](#headlessrunts--the-headless-game-loop):

- **`evaluateAgent` ([`src/ai/evaluateAgent.ts`](../../src/ai/evaluateAgent.ts))** — runs an agent over a seed set and reports a full statistical summary, not just averages. The headline metric is still **average blinds cleared** (`avgBlinds`), a finer-grained signal than the near-zero win rate, but the result also carries:
  - **Win signal** — `wins`, `winRate`, `winRateStdErr` (binomial standard error, so a win-rate delta can be read against its noise), and `reachedFinalAnte` (how many runs got to the last ante even if they died on it).
  - **Distributions** — for `anteReached`, `blindsCleared`, `handsPlayed`, `blindsSkipped`, and the new `finalMoney`, the full [`Distribution`](../../src/ai/evaluationStats.ts) (`mean`, `min`, `max`, `median`, `p25`, `p75`, `stdDev`). A high mean hiding a wide spread or a long lower tail is now visible.
  - **`lossAnteHistogram`** — where losing runs die, bucketed by ante. A spike at one ante points at a wall the policy can't clear.
  - **`shopActivity`** — average per-game `rerolls`, `jokersBought`, `consumablesBought`, `vouchersBought`, `packsOpened`, `packPicks`, and `moneySpent` (see [`shopActivity.ts`](../../src/ai/shopActivity.ts)). Paired with `finalMoney`, this is the lens for **economy bugs**: money piling up with `packsOpened`/`packPicks` near zero means the shop agent is sitting on cash instead of opening packs.
- **`benchmarkPolicy.ts` ([`scripts/benchmarkPolicy.ts`](../../scripts/benchmarkPolicy.ts))** — loads one or more `.onnx` files, wraps each as a [policy agent](#policyagentts), evaluates them on a held-out seed offset against a **greedy baseline**, and prints **both** a compact comparison table (the headline columns, `avgBlinds` third so `distillPolicy`'s `parseAvgBlinds` keeps working) **and** a detailed per-agent block (distributions, loss-by-ante histogram, and shop activity). `avgBlinds` is still the ship gate — **a new model ships only if it beats the incumbent on `avgBlinds`** across disjoint seeds — but the extra metrics are there to catch regressions the headline number hides (e.g. the pack-purchasing economy bug above).

- **`evaluate_real_play.py` ([`ml/evaluate_real_play.py`](../../ml/evaluate_real_play.py))** — a *different* lens: top-1 **agreement** of a policy with **real human decisions** (not rollout outcomes), reported overall and broken down by kind (play/discard, or purchase/reroll/pack-pick), against a `chance_agreement` baseline (`mean(1/len(candidates))`). This cross-checks how human-aligned a shipped model is — e.g. the hand policy agrees with human play far more often than the shop policy, reflecting that hand play is near-determinate while shop strategy is subjective. Only encoding-v4 models (v8) are reproducible from the current Python encoder.

### `policyAgent.ts`

[`src/ai/policyAgent.ts`](../../src/ai/policyAgent.ts) — `createPolicyAgent(ranker, topN = 3)` wraps a [`CandidateRanker`](./engine-plumbing.md#how-the-policy-ranks-the-onnx-side) into a `HeadlessAgent`: get top-N candidates, `toModelState`, `ranker.rank`, play the top-ranked candidate. This is how a trained `.onnx` is dropped into the headless benchmark and into in-game autopilot.

The baseline agents it's measured against live in [`src/ai/agents.ts`](../../src/ai/agents.ts): `createGreedyAgent` (always the single best-scoring play — the floor a learned policy must beat), `createRandomAgent(rng)` (a seeded random player — the sanity floor), and `createSkipAgent(base, shouldSkip)` (wraps any agent to skip blinds for worthwhile [tags](https://balatrowiki.org/w/Tags)). All of them — greedy, random, search expert, policy — share the one `HeadlessAgent` interface, which is what lets the benchmark compare them apples-to-apples.

---

## The shop policy

Shop and pack decisions are a separate model with a separate [build-aware 78-feature encoding](./engine-plumbing.md#shop-encoding-shopencodingts), separate labels, and a separate file (`advisor-shop-policy-v10.onnx`).

- **`headlessShopAgent.ts` ([`src/ai/headlessShopAgent.ts`](../../src/ai/headlessShopAgent.ts))** — `createHeadlessShopAgent(modelPath)` loads the shop ONNX and implements `buyAfterRound`: it encodes the shop offers + voucher + reroll + leave as candidates, runs inference, and acts on the top-ranked option (buying jokers/planets/tarots/spectrals, rerolling, opening packs with a nested pick loop, or leaving). This is the *inference-time* shop agent.
- **`shopRolloutExpert.ts` ([`src/ai/shopRolloutExpert.ts`](../../src/ai/shopRolloutExpert.ts))** — the *labeling* expert: `bestShopChoice(...)` scores each offer by [resuming a headless run](#resumable-seams-why-this-enables-search--rollouts) from after the purchase and measuring average `blindsCleared` over a few rollouts (`rolloutValue`), compared against the value of just leaving. The best-value offer is the label. This is "judge a purchase by simulated forward play" — shallow, which is exactly why an [LLM teacher](#teacher-distillation-offline-machinery) (`#1338`) is the proposed next lever.
- **`headlessConsumables.ts` ([`src/ai/headlessConsumables.ts`](../../src/ai/headlessConsumables.ts))** — `applyTarotEffectToDeck` / `applySpectralEffectToDeck` apply [tarot](https://balatrowiki.org/w/Tarot_Cards)/[spectral](https://balatrowiki.org/w/Spectral_Cards) effects to the deck headlessly (deterministic RNG), so rollouts that buy/use consumables stay faithful.

---

## Teacher distillation (offline machinery)

> **Status:** the shipped **hand** policy ([`advisor-policy-v9`](../../public/models/advisor-policy-v9.onnx)) **is** teacher-distilled — trained on realistic shop-driven data with a distribution-matched LLM teacher (`#1153`). The teacher must be regenerated on the same realistic dataset it trains against (see the [required data framework](#required-data-framework--real-everything-never-greedy)); an off-distribution teacher hurts. Applying the same to the **shop** policy is still open (`#1338`); the shipped `advisor-shop-policy-v10` is trained by on-policy self-play with a PPO trust region (`#1552`), warm-started from `advisor-shop-policy-v9` and iterated on the voucher-aware, sell-capable headless sim, not teacher-distilled.

The idea is [knowledge distillation](https://en.wikipedia.org/wiki/Knowledge_distillation): spend expensive [LLM](./llm-advisor.md) calls **offline** to relabel exactly the states where the cheap student is weak, then bake that judgment into the student.

- **`scripts/labelDisagreements.ts`** — finds states where the ONNX policy's top pick disagrees with the search expert, calls `requestAdvice` (a `createRequestAdviceTeacher(apiKey)` wrapping the [LLM advisor](./llm-advisor.md), model overridable via `ADVISOR_MODEL`) on those states, and writes the teacher's `recommendationIndex` as the new `chosen` — emitting the **same `schemaVersion: 1` JSONL** the trainer already ingests. A `--min-score-fraction` **quality gate** drops teacher labels whose chosen action can't be justified against the engine's own numbers, so noise isn't distilled.
- **`ml/train.py --teacher`** — trains those labels at `--teacher-weight`, never held out.
- **`scripts/distillPolicy.ts`** — orchestrates the full cycle (generate → label → train → benchmark) and a `shipVerdict` that ships only on a positive `avgBlinds` delta.

The reason this is gated on outcome-benchmarking rather than validation accuracy is the [trap noted above](#mldatasetpy--ingestion--weighting): teacher labels are valuable *because* they diverge from the expert.

---

## Scripts reference

All under [`scripts/`](../../scripts/), run with `yarn dlx tsx scripts/<name>.ts` (or see [running-locally.md](./running-locally.md)). Python scripts run from [`ml/`](../../ml/).

| Script | What it does |
| --- | --- |
| `scripts/generateDataset.ts` | Run the search expert through N headless games → hand-decision JSONL. Flags: `--games`, `--seed-offset`, `--rollouts`, `--top-n`, `--max-ante`, `--joker-loadout-fraction`, `--deck`, `--stake`, `--shop-policy`, `--parallel-jobs`. |
| `scripts/generateShopRolloutDataset.ts` | Rollout-labeled shop/pack decisions → `RunEventRecord` JSONL. Flags: `--games`, `--hand-model`, `--horizon`, `--rollouts`, `--parallel-jobs`. |
| `scripts/labelDisagreements.ts` | Relabel policy-vs-expert disagreements via the LLM teacher (needs `ANTHROPIC_API_KEY`). Flags: `--model`, `--min-score-fraction`, `--limit`, `--concurrency`. |
| `scripts/gateShopCorrections.ts` | Rollout-gate shop `advice-feedback` corrections (drops picks well below the best rolled-out choice) before `--shop --corrections`. Flags: `--hand-model`, `--horizon`, `--rollouts`, `--min-score-fraction`. |
| `scripts/benchmarkPolicy.ts` | Benchmark one+ `.onnx` vs. a greedy baseline. Flags: `--games`, `--seed-offset`, `--deck`, `--stake`, `--shop-policy`, `--no-shop`, `--skip`. |
| `scripts/distillPolicy.ts` | Orchestrate the full distillation cycle + ship verdict. |
| `ml/train.py` | Train + export the ONNX policy (hand or `--shop`). |
| `ml/evaluate_real_play.py` | Agreement of a policy vs. real human decisions. |

`ml/requirements.txt`: `torch>=2.2`, `onnx>=1.15`, `onnxscript>=0.1` (plus `onnxruntime` for `evaluate_real_play.py`). `ml/tests/`: `test_encoding.py` (vector lengths/positions, golden vectors), `test_dataset.py` (loading/weighting/splitting/shop routing), `test_evaluate_real_play.py` (agreement metrics).
