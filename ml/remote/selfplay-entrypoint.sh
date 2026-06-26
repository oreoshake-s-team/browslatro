#!/usr/bin/env bash
set -euo pipefail

: "${OUTPUT_KEY:?OUTPUT_KEY is required}"
: "${GAMES:?GAMES is required}"
: "${AWS_ENDPOINT_URL_S3:?AWS_ENDPOINT_URL_S3 is required}"
: "${BROWSLATRO_DATASET_BUCKET:?BROWSLATRO_DATASET_BUCKET is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"

SEED_OFFSET="${SEED_OFFSET:-0}"
SHOP_MODEL="${SHOP_MODEL:-public/models/advisor-shop-policy-v9.onnx}"
HAND_MODEL="${HAND_MODEL:-public/models/advisor-policy-v9.onnx}"
TEMPERATURE="${TEMPERATURE:-1.0}"

SHARD="$(mktemp /tmp/selfplay-XXXXXX.jsonl)"

echo "collecting self-play: games=$GAMES seed-offset=$SEED_OFFSET shop=$SHOP_MODEL hand=$HAND_MODEL temp=$TEMPERATURE -> $OUTPUT_KEY"
yarn dlx tsx scripts/collectSelfPlayShop.ts "$SHARD" \
  --games "$GAMES" \
  --seed-offset "$SEED_OFFSET" \
  --shop-model "$SHOP_MODEL" \
  --hand-model "$HAND_MODEL" \
  --temperature "$TEMPERATURE"
yarn dlx tsx scripts/remote/putShard.ts "$SHARD" "$OUTPUT_KEY"
echo "self-play shard complete: $OUTPUT_KEY"
