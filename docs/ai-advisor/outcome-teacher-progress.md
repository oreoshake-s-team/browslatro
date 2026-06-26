# Outcome-teacher experiments — work-in-progress handoff

Status snapshot for resuming on another machine. Branch: `feat/outcome-teacher-experiments`
(based on `main` at `23819ef`, the v8 ship). This doc + the branch code are the transfer.

## On-policy iteration — 2026-06-26 (Track B, issue #1545) — BREAKS THE CEILING

The single off-policy REINFORCE step (training a fresh model on v8-sampled data) only
reached avgBlinds 3.60. The fix was **on-policy iteration**: warm-start the scorer from
the policy that generated the self-play, step on its own returns, repeat. Enablers shipped:
`ml/train_rl.py --init <onnx>` (by-name warm-start, verified to reproduce v8 at 0.0 diff)
and the driver `ml/on_policy_track_b.sh` (sample → warm-start-train → benchmark, looped).

| run | best iterate | avgBlinds (hand v9, 4 seeds × 500) | vs v8 (5.078) |
|---|---|---|---|
| baseline (lr 1e-3, 20 epochs/round, 5 iters) | iter-2 / iter-4 | 5.038 / 5.022 | ≈ parity |
| **damped (lr 3e-4, 6 epochs/round, 8 iters)** | **iter-6** | **5.473** | **+0.40, beats v8 on all 4 seeds (5.30–5.60)** |

- On-policy iteration recovers to v8 parity (vs 3.60 off-policy) and the damped run's best
  iterate **exceeds v8 on every seed** — the first policy to beat the incumbent, not just match it.
- **It oscillates** in a 2-cycle between a "build/buy" mode (~5.x) and a "pack-heavy/broke" mode
  (~3.x); damping the step (lower lr, fewer epochs/round) did NOT remove the oscillation, so it is
  structural — single-step updates overshoot. **You must select the best iterate by validation**,
  not take the last. A proper trust region (KL penalty / PPO-style clip toward the sampling policy)
  is the next lever to stabilize and push further.
- Selection caveat: iter-6 was picked from its single-seed (5000) peak, then confirmed on 4 seeds;
  3/4 are out-of-sample and all beat v8, so the win is not a seed artifact. A fully clean protocol
  would select on a held-out seed disjoint from the final eval.
- The winning artifact is `ml/outcome/onpolicy-damped/iter-6.onnx` (gitignored scratch).

## Resume run — 2026-06-25 (CPU box, both planned experiments executed)

`main` merged into this branch (clean; `headlessShopAgent.ts` kept both the shop-activity
tracking from `main` and the `chooseIndex`/`onShopDecision` hooks — no conflict materialized).
Typecheck clean, affected unit tests pass. The OOM open issue below is **resolved** — it was
memory pressure, not a bug; `--parallel-jobs 4` + a heap bump runs clean.

Both planned experiments ran end-to-end on a CPU-only box (no CUDA) and both are **clean
negatives** vs the v8 incumbent (hand v9, 4 seeds × 500 games, full statistical summary):

| shop policy | avgBlinds | avgAnte | vs v8 | verdict |
|---|---|---|---|---|
| **v8** (incumbent, reproduced) | 5.078 | 2.31 | — | baseline (matches doc's 5.082) |
| **strong-build pivot** (`--games 1000 --horizon 8 --rollouts 1`) | 4.875 | 2.25 | −0.20 | below v8, uniform across all 4 seeds |
| **Track B self-play REINFORCE** (original) | 3.06 | 1.69 | −2.02 | policy **collapsed** (buys nothing, only opens packs) |
| **Track B REINFORCE (stabilized)** | 3.60 | 1.86 | −1.47 | trainer fixed (converges, stays stochastic); off-policy single step still < v8 |

- **Strong-build pivot:** the richer build labels (planets/tarots/spectrals + x-mult priority)
  made the policy buy *more* aggressively (vouchers 0.29 vs v8 0.00, more rerolls) but it ends
  poorer (money 16.1 vs 19.1) and dies marginally shallower (tail to ante 6 vs v8's ante 7).
  Richer build prior did not break the imitation ceiling — consistent with the Track A finding.
- **Track B REINFORCE:** the original `ml/train_rl.py` loss diverged monotonically to −5449
  (signed-advantage cross-entropy is unbounded below: negative advantages drive the chosen
  log-prob to −∞ → degenerate policy, 0 jokers/consumables/vouchers, avgBlinds 3.06).
  **Stabilized** (committed): standardized + tail-clamped advantages (`--adv-clip`), a log-prob
  floor (`--logp-floor`) bounding each update, and an entropy bonus (`--entropy-coef`). Loss now
  converges (~−2.70) and entropy holds ~0.67 (stochastic, not collapsed). The stabilized policy
  reaches avgBlinds 3.60 — no longer degenerate, but still below v8. Diagnosis: this is a **single
  off-policy REINFORCE step** (data sampled from v8, fresh model, no importance weighting / no v8
  init), which lands a weak pack-heavy policy. Making Track B competitive needs **on-policy
  iteration**: initialize from v8 and re-sample self-play from the *current* policy each round.
- **v7 shop policy is no longer benchmarkable** on this code: it predates encoding v4 and the
  current `headlessShopAgent` feeds 78 features → onnxruntime shape error. The doc's v7 baseline
  (5.578) was measured on the old encoding and is not apples-to-apples with v8/candidate today.

Offline recipe used on this box (npm registry DNS-blocked, so no `yarn dlx`): Node 24 runs TS via
an offline `tsx` assembled from the global Berry cache —
`node --import file://<cache>/tsx/dist/loader.mjs scripts/<x>.ts …` (esbuild symlinked from the
pnpm store; deps under a real `node_modules/`). Training: `python ml/train.py … --device cpu`
(tiny net, ~8s). Artifacts under `ml/outcome/` (gitignored scratch): `strongbuild.{jsonl,onnx}`,
`selfplay.{jsonl,onnx}`, `logs/`.

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
- `ml/train_rl.py` — **REINFORCE trainer**: standardized + tail-clamped advantages, a log-prob
  floor, and an entropy bonus (stabilized 2026-06-25; the bare signed-advantage CE collapsed).
  Torch imports are deferred into `main()` so the pure helpers stay importable for `ml/tests`.

`yarn typecheck` was clean at last edit; new unit tests pass.

## ~~OPEN ISSUE~~ RESOLVED — full-horizon strong-build regen was OOM (memory pressure)

**Resolved 2026-06-25:** it was memory pressure, not a bug. Re-ran at `--parallel-jobs 4` with
`NODE_OPTIONS=--max-old-space-size=4096` and the full 1000-game / horizon-8 generation completed
cleanly (12,916 records in ~27 min, all 4 jobs finished). Original diagnosis below for context.

`generateShopRolloutDataset` at `--horizon 8` with the stronger heuristic died partway with
`--parallel-jobs 6` (silently — no stack trace), because the stronger build makes playouts
survive deeper, so full-horizon rollouts become near-full-length games → big memory × 6 jobs
on 16 GB.

**DIAGNOSED — it's memory pressure, not a code bug.** A single-job run
(`--parallel-jobs 1 --games 30`, `NODE_OPTIONS=--max-old-space-size=4096`) ran cleanly and
produced **191 valid records spanning antes 1–5** (deep games work) before the session was torn
down — no crash, no error. So the stronger heuristic at full horizon is correct.

**FIX (do this on the new machine):** run the regen with **`--parallel-jobs 4`** (and
`export NODE_OPTIONS=--max-old-space-size=4096`). If 4 still presses memory on a 16 GB box,
drop to 3 or lower `--games` per run and concatenate. A bigger-RAM machine can go back to 6.

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
