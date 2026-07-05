#!/usr/bin/env bash
set -euo pipefail

: "${OUTPUT_KEY:?OUTPUT_KEY is required}"
: "${GAMES:?GAMES is required}"
: "${AWS_ENDPOINT_URL_S3:?AWS_ENDPOINT_URL_S3 is required}"
: "${BROWSLATRO_DATASET_BUCKET:?BROWSLATRO_DATASET_BUCKET is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"

SEED_OFFSET="${SEED_OFFSET:-0}"
# Fallback model paths mirror src/ai/advisor/productionModels.ts — update together.
SHOP_MODEL="${SHOP_MODEL:-public/models/advisor-shop-policy-v15.onnx}"
HAND_MODEL="${HAND_MODEL:-public/models/advisor-policy-v9.onnx}"
TEMPERATURE="${TEMPERATURE:-1.0}"
HOLD="${HOLD:-0}"
PARALLEL_JOBS="${PARALLEL_JOBS:-1}"

if [[ -n "${SHOP_MODEL_KEY:-}" ]]; then
  SHOP_MODEL="$(mktemp /tmp/shop-model-XXXXXX.onnx)"
  echo "downloading shop model: $SHOP_MODEL_KEY"
  yarn dlx tsx scripts/remote/getObjectCli.ts "$SHOP_MODEL_KEY" "$SHOP_MODEL"
  if [[ ! -s "$SHOP_MODEL" ]]; then
    echo "shop model object $SHOP_MODEL_KEY is empty" >&2
    exit 1
  fi
fi

starts_args=()
if [[ -n "${STARTS_KEY:-}" ]]; then
  STARTS_FILE="$(mktemp /tmp/starts-XXXXXX.jsonl)"
  echo "downloading deep-run starts: $STARTS_KEY"
  yarn dlx tsx scripts/remote/getObjectCli.ts "$STARTS_KEY" "$STARTS_FILE"
  if [[ ! -s "$STARTS_FILE" ]]; then
    echo "starts object $STARTS_KEY is empty" >&2
    exit 1
  fi
  starts_args+=(--starts-file "$STARTS_FILE" --exploring-starts-fraction "${STARTS_FRACTION:-0.25}")
fi

SHARD="$(mktemp /tmp/selfplay-XXXXXX.jsonl)"

selfplay_args=(
  "$SHARD"
  --games "$GAMES"
  --seed-offset "$SEED_OFFSET"
  --shop-model "$SHOP_MODEL"
  --hand-model "$HAND_MODEL"
  --temperature "$TEMPERATURE"
  --parallel-jobs "$PARALLEL_JOBS"
)
if [ "$HOLD" = "1" ]; then
  selfplay_args+=(--hold-consumables)
fi
if [ ${#starts_args[@]} -gt 0 ]; then
  selfplay_args+=("${starts_args[@]}")
fi

echo "collecting self-play: games=$GAMES seed-offset=$SEED_OFFSET shop=$SHOP_MODEL hand=$HAND_MODEL temp=$TEMPERATURE hold=$HOLD jobs=$PARALLEL_JOBS -> $OUTPUT_KEY"
yarn dlx tsx scripts/collectSelfPlayShop.ts "${selfplay_args[@]}"
yarn dlx tsx scripts/remote/putShard.ts "$SHARD" "$OUTPUT_KEY"
echo "self-play shard complete: $OUTPUT_KEY"
