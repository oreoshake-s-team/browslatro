#!/usr/bin/env bash
# On-policy self-play iteration for the shop advisor (Track B).
#
# Each round samples self-play from the *current* policy, then warm-starts the
# REINFORCE trainer from that same policy and steps it on the freshly-sampled
# (on-policy) returns. Bootstrapped from a base policy (v10 by default) so the
# first round improves a competent policy rather than a random init.
#
# Override the TS runner for offline/sandboxed boxes, e.g.:
#   TSX_RUN="node --import file:///path/to/tsx/dist/loader.mjs" ml/on_policy_track_b.sh
set -euo pipefail

# Fallback model paths mirror src/ai/advisor/productionModels.ts — update together.
BASE="${BASE:-public/models/advisor-shop-policy-v15.onnx}"
HAND="${HAND:-public/models/advisor-policy-v9.onnx}"
ITERS="${ITERS:-5}"
GAMES="${GAMES:-1000}"
TEMPERATURE="${TEMPERATURE:-1.0}"
BENCH_GAMES="${BENCH_GAMES:-500}"
BENCH_SEED="${BENCH_SEED:-5000}"
DEVICE="${DEVICE:-cpu}"
EPOCHS="${EPOCHS:-20}"
LR="${LR:-1e-3}"
PPO_CLIP="${PPO_CLIP:-0.2}"
OUTDIR="${OUTDIR:-ml/outcome/onpolicy}"
HOLD="${HOLD:-0}"
PARALLEL_JOBS="${PARALLEL_JOBS:-1}"
VALUE_BASELINE="${VALUE_BASELINE:-0}"
VALUE_COEF="${VALUE_COEF:-0.5}"
REWARD_TO_GO="${REWARD_TO_GO:-0}"
GAE="${GAE:-}"
TSX_RUN="${TSX_RUN:-node .yarn/releases/yarn-4.15.0.cjs dlx tsx}"
PYTHON="${PYTHON:-python3}"

hold_flag=()
v2_flag=()
if [ "$HOLD" = "1" ]; then
  hold_flag=(--hold-consumables)
  v2_flag=(--v2)
fi

value_flag=()
if [ "$VALUE_BASELINE" = "1" ]; then
  value_flag=(--value-baseline --value-coef "$VALUE_COEF")
fi
if [ "$REWARD_TO_GO" = "1" ]; then
  value_flag+=(--reward-to-go)
fi
if [ -n "$GAE" ]; then
  value_flag+=(--gae "$GAE")
fi

# Optional offline distillation channels folded into each on-policy train step:
# the PPO update on fresh self-play plus an auxiliary cross-entropy toward an
# LLM teacher's and/or a human's shop picks (see train_rl.py --teacher /
# --corrections / --agreements). This keeps LLM and human shop signal *adding
# to* the RL incumbent rather than training a standalone supervised competitor.
distill_flag=()
if [ -n "${TEACHER:-}" ]; then
  distill_flag+=(--teacher "$TEACHER" --teacher-coef "${TEACHER_COEF:-1.0}")
fi
if [ -n "${HUMAN:-}" ]; then
  distill_flag+=(--human "$HUMAN" --human-coef "${HUMAN_COEF:-1.0}")
fi
if [ -n "${CORRECTIONS:-}" ]; then
  distill_flag+=(--corrections "$CORRECTIONS" --corrections-coef "${CORRECTIONS_COEF:-1.0}")
fi
if [ -n "${AGREEMENTS:-}" ]; then
  distill_flag+=(--agreements "$AGREEMENTS" --agreements-coef "${AGREEMENTS_COEF:-1.0}")
fi

mkdir -p "$OUTDIR"
current="$BASE"
echo "iter 0 (base): $current"

for k in $(seq 1 "$ITERS"); do
  data="$OUTDIR/sp-$k.jsonl"
  next="$OUTDIR/iter-$k.onnx"
  sp_seed=$(( ${SP_SEED_BASE:-0} + (k - 1) * GAMES ))
  echo "=== iteration $k: sampling $GAMES games from $(basename "$current") (seed $sp_seed) ==="
  $TSX_RUN scripts/collectSelfPlayShop.ts "$data" \
    --games "$GAMES" --seed-offset "$sp_seed" --shop-model "$current" --hand-model "$HAND" \
    --temperature "$TEMPERATURE" --parallel-jobs "$PARALLEL_JOBS" "${hold_flag[@]}"
  $PYTHON ml/train_rl.py "$data" --device "$DEVICE" --init "$current" \
    --epochs "$EPOCHS" --lr "$LR" --ppo-clip "$PPO_CLIP" --out "$next" \
    "${v2_flag[@]}" "${value_flag[@]}" "${distill_flag[@]}"
  echo "--- benchmark iter $k ($BENCH_GAMES games, seed $BENCH_SEED) ---"
  $TSX_RUN scripts/benchmarkPolicy.ts "$HAND" \
    --games "$BENCH_GAMES" --seed-offset "$BENCH_SEED" --shop-policy "$next" "${hold_flag[@]}" \
    | grep -E "advisor-policy|wins |ante |blinds |shop "
  current="$next"
done
echo "done; final model: $current"
