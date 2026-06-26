# Outcome-teacher experiments — work-in-progress handoff

Status snapshot for resuming on another machine. Branch: `feat/outcome-teacher-experiments`
(based on `main` at `23819ef`, the v8 ship). This doc + the branch code are the transfer.

## Goal

Make the ML **shop** advisor build a winning engine — escape the "imitation ceiling"
where every teacher tried so far (greedy expert, LLM, expert-iteration) caps the
policy at roughly the incumbent's level instead of producing a winning build. The
build (what you buy in the shop) is the proven bottleneck: a good build carries the
existing hand policy to ante ~7, a bad one dies at ante 2–3.

This is follow-up work from issue #1524 (investigation) after shipping v8.

## Shipped to `main`

- **PR #1526** — `advisor-shop-policy-v8` (build-aware encoding; strategic buys+leaves+rerolls;
  `$30` reroll rule via `rerollAllowed`). Intentional avgBlinds tradeoff (5.082 vs v7 5.578).
- **PR #1540** — full-horizon permanent: rollout `--horizon` default `3 → 8`.

## Benchmark baselines (hand v9, 500 games × 4 disjoint seeds 5000/6000/7000/8000, avgBlinds)

| model | avgBlinds | note |
|---|---|---|
| v7 (prior incumbent) | 5.578 | |
| v8 (shipped) | 5.082 | strategic; intentional tradeoff |
| buysonly (build-aware, no leave/reroll labels) | 5.647 | best on benchmark; **rejected** by author ("not the path forward") |
| Track A (expert iteration) | 4.188 | NEGATIVE — see below |
| control (old teacher, 120 games) | 5.048 | same 120-game scale as Track A |

## Experiments run

### Track A — expert iteration (DEAD END, clean negative)
Rollout teacher with: full horizon + **v8 policy as the rollout playout** + win bonus.
Result **4.188 vs control 5.048** at identical 120-game scale → it *hurt*.
**Mechanism:** the old playout is the joker-stacking heuristic, which aggressively
buys jokers, so "buy this joker" rolls out into a built run → high value → buying is
rewarded. Swapping in the *passive, leave-heavy* v8 policy as playout makes the
continuation build less → buying scores lower → teacher undervalues building.
Expert iteration backfires because the current policy is a **worse builder** than the
heuristic it replaced. Full horizon was inert here (playout dies ante 3–4 anyway).

### Pivot — stronger build prior (ACTIVE)
Insight from Track A: the aggressive heuristic playout is a strong build prior. So make
it *stronger*. `createJokerStackingShopAgent` now also buys **planets / tarots / spectrals**
(not just jokers) and prioritizes **x-mult > planets > mult > tarots > filler** via
`offerBuildValue`. Hypothesis: richer build labels → model that builds better.
**Blocked on compute** — see open issue below.

### Track B — self-play REINFORCE (BUILT, not yet run)
Different mechanism: learn from *actual game returns* of trajectories the policy sampled
(no playout policy → not capped by a teacher). Collector + trainer are done and smoke-tested
(54 decisions from 8 games parse cleanly). Not yet run as a full iteration.

## Uncommitted code on this branch (what each file does)

- `src/ai/rolloutShopAgent.ts` — **stronger build heuristic** + exported `offerBuildValue`.
- `src/ai/rolloutShopAgent.test.ts` — priority tests (x-mult > planet > tarot, etc.).
- `src/ai/shopRolloutExpert.ts` — `winBonus` added to `RolloutOptions` / `rolloutValue`.
- `scripts/generateShopRolloutDataset.ts` — `--rollout-shop-model` (policy-as-playout),
  `--win-bonus` flags; horizon default 8 (redundant with #1540 — will conflict-merge trivially).
- `scripts/gateShopCorrections.ts` — horizon default 8 (same).
- `src/ai/headlessShopAgent.ts` — backward-compatible `chooseIndex` (sampler) +
  `onShopDecision` (recorder) options + `buildShopDecisionLog`. Default args = shipped
  argmax/no-record behavior (its tests pass unchanged).
- `src/ai/headlessShopAgent.test.ts` — `buildShopDecisionLog` tests (purchase/leave/reroll/voucher-skip).
- `scripts/collectSelfPlayShop.ts` — **self-play collector**: plays games sampling from the
  policy (softmax/temperature), tags each shop decision with the game's realized return.
- `ml/train_rl.py` — **REINFORCE trainer**: normalized advantages, signed-advantage cross-entropy.

`yarn typecheck` was clean at last edit; new unit tests pass.

## OPEN ISSUE — full-horizon strong-build regen keeps dying

`generateShopRolloutDataset` at `--horizon 8` with the stronger heuristic fails partway
(last run reached `3/6 jobs done` then a worker died **silently** — no stack trace). Suspected
**memory pressure**: the stronger build makes playouts survive deeper, so full-horizon
rollouts become near-full-length games → big memory × 6 parallel jobs on 16 GB.
A single-job diagnostic (`--parallel-jobs 1 --games 30`, `NODE_OPTIONS=--max-old-space-size=4096`)
was running at handoff to confirm OOM-vs-bug — check `…/outcome/logs/sb-diag.log`.
**If OOM:** drop to `--parallel-jobs 4` (+ `NODE_OPTIONS` heap) or reduce games.
**If it crashes single-job at a seed:** real bug in the stronger heuristic — get the stack trace.

## How to resume (commands)

Local env: yarn = `node .yarn/releases/yarn-4.15.0.cjs`; Python venv with torch+cuda;
`PYTHONUTF8=1` for onnx export. Run `yarn install` first on a fresh checkout.

```
# 1. regenerate strong-build labels (full horizon; fewer jobs to avoid OOM)
node .yarn/releases/yarn-4.15.0.cjs dlx tsx scripts/generateShopRolloutDataset.ts out.jsonl \
  --games 1000 --horizon 8 --rollouts 1 --parallel-jobs 4
# 2. train (GPU)
python ml/train.py out.jsonl --shop --device cuda --batch-size 256 --out model.onnx
# 3. benchmark (4 seeds)
node .yarn/releases/yarn-4.15.0.cjs dlx tsx scripts/benchmarkPolicy.ts \
  public/models/advisor-policy-v9.onnx --games 500 --seed-offset 5000 --shop-policy model.onnx

# Track B (self-play REINFORCE) one iteration:
node .yarn/releases/yarn-4.15.0.cjs dlx tsx scripts/collectSelfPlayShop.ts sp.jsonl \
  --games 1000 --shop-model public/models/advisor-shop-policy-v8.onnx --temperature 1.0
python ml/train_rl.py sp.jsonl --device cuda --out rl.onnx   # then benchmark rl.onnx
```

## BEFORE benchmarking — get the new report format

The author wants benchmarks reported in the **full statistical summary** format
(squash-merged to `main`; original commit `552329`): comparison table + per-agent block
(win-rate ± SE, ante/blinds/money distributions, loss-by-ante histogram, shop activity).
That tooling is on `main` but NOT on this branch. **Merge latest `main` into this branch first.**
Expect ONE conflict in `src/ai/headlessShopAgent.ts` (main added per-game shop-activity
tracking there; this branch added the `chooseIndex`/`onShopDecision` hooks) — keep both.
Then `benchmarkPolicy` prints the full summary; report THAT, not just avgBlinds.

## Key learnings

- Build is the bottleneck; imitation teachers cap at incumbent parity.
- Expert iteration with the current policy as playout backfires when the policy builds
  worse than the heuristic it replaces.
- Leave/reroll labels hurt because the weak agent never reaches the regime (rich mid-game)
  where banking interest / strategic rerolls pay off.
- The aggressive joker-stacking heuristic is the strongest build prior found; the active
  bet is to make it richer (planets/tarots/spectrals + x-mult priority).
