#!/usr/bin/env bash
set -euo pipefail

: "${OUTPUT_KEY:?OUTPUT_KEY is required}"
: "${GAMES:?GAMES is required}"
: "${AWS_ENDPOINT_URL_S3:?AWS_ENDPOINT_URL_S3 is required}"
: "${BROWSLATRO_DATASET_BUCKET:?BROWSLATRO_DATASET_BUCKET is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"

SEED_OFFSET="${SEED_OFFSET:-0}"
ROLLOUTS="${ROLLOUTS:-4}"
TOP_N="${TOP_N:-3}"
MAX_ANTE="${MAX_ANTE:-8}"
DECK="${DECK:-red}"
STAKE="${STAKE:-white}"
JOKER_LOADOUT_FRACTION="${JOKER_LOADOUT_FRACTION:-0}"

SHARD="$(mktemp /tmp/shard-XXXXXX.jsonl)"

generate_args=(
  "$SHARD"
  --games "$GAMES"
  --seed-offset "$SEED_OFFSET"
  --rollouts "$ROLLOUTS"
  --top-n "$TOP_N"
  --max-ante "$MAX_ANTE"
  --deck "$DECK"
  --stake "$STAKE"
  --joker-loadout-fraction "$JOKER_LOADOUT_FRACTION"
)

if [[ -n "${SHOP_POLICY:-}" ]]; then
  generate_args+=(--shop-policy "$SHOP_POLICY")
fi

echo "generating shard: games=$GAMES seed-offset=$SEED_OFFSET -> $OUTPUT_KEY"
yarn dlx tsx scripts/generateDataset.ts "${generate_args[@]}"
yarn dlx tsx scripts/remote/putShard.ts "$SHARD" "$OUTPUT_KEY"
echo "shard complete: $OUTPUT_KEY"
