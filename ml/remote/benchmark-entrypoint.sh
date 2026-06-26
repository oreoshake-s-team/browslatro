#!/usr/bin/env bash
set -euo pipefail

: "${MODEL_KEY:?MODEL_KEY is required}"
: "${OUTPUT_KEY:?OUTPUT_KEY is required}"
: "${AWS_ENDPOINT_URL_S3:?AWS_ENDPOINT_URL_S3 is required}"
: "${BROWSLATRO_DATASET_BUCKET:?BROWSLATRO_DATASET_BUCKET is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"

GAMES="${GAMES:-200}"
SEED_OFFSET="${SEED_OFFSET:-5000}"
DECK="${DECK:-red-deck}"
STAKE="${STAKE:-white}"
SHOP="${SHOP:-1}"

CANDIDATE="$(mktemp /tmp/candidate-XXXXXX.onnx)"
SUMMARY="$(mktemp /tmp/summary-XXXXXX.json)"

echo "downloading candidate: $MODEL_KEY"
yarn dlx tsx scripts/remote/getObjectCli.ts "$MODEL_KEY" "$CANDIDATE"

benchmark_args=("$CANDIDATE")
if [[ -n "${BASELINE:-}" ]]; then
  benchmark_args+=("$BASELINE")
fi
benchmark_args+=(
  --games "$GAMES"
  --seed-offset "$SEED_OFFSET"
  --deck "$DECK"
  --stake "$STAKE"
  --json "$SUMMARY"
)
if [[ "$SHOP" != "1" ]]; then
  benchmark_args+=(--no-shop)
fi

echo "benchmarking: games=$GAMES seed-offset=$SEED_OFFSET deck=$DECK stake=$STAKE shop=$SHOP"
yarn dlx tsx scripts/benchmarkPolicy.ts "${benchmark_args[@]}"

echo "uploading summary -> $OUTPUT_KEY"
yarn dlx tsx scripts/remote/putShard.ts "$SUMMARY" "$OUTPUT_KEY"
echo "benchmark complete: $OUTPUT_KEY"
