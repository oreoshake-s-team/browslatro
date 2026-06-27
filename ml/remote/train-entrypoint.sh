#!/usr/bin/env bash
set -euo pipefail

: "${DATASET_KEY:?DATASET_KEY is required}"
: "${OUTPUT_KEY:?OUTPUT_KEY is required}"
: "${AWS_ENDPOINT_URL_S3:?AWS_ENDPOINT_URL_S3 is required}"
: "${BROWSLATRO_DATASET_BUCKET:?BROWSLATRO_DATASET_BUCKET is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"

EPOCHS="${EPOCHS:-30}"
DEVICE="${DEVICE:-cpu}"
SHOP="${SHOP:-0}"
HUMAN="${HUMAN:-0}"
HUMAN_WEIGHT="${HUMAN_WEIGHT:-5}"
HUMAN_KEY="${HUMAN_KEY:-}"

DATASET="$(mktemp /tmp/dataset-XXXXXX.jsonl)"
MODEL="$(mktemp /tmp/model-XXXXXX.onnx)"

echo "downloading dataset: $DATASET_KEY"
yarn dlx tsx scripts/remote/getObjectCli.ts "$DATASET_KEY" "$DATASET"

train_args=("$DATASET" --epochs "$EPOCHS" --device "$DEVICE" --out "$MODEL")
if [[ "$SHOP" == "1" ]]; then
  train_args+=(--shop)
fi

human_args=()

if [[ -n "$HUMAN_KEY" ]]; then
  HUMAN_FILE="$(mktemp /tmp/human-XXXXXX.jsonl)"
  echo "downloading human-play log: $HUMAN_KEY"
  yarn dlx tsx scripts/remote/getObjectCli.ts "$HUMAN_KEY" "$HUMAN_FILE"
  human_args+=(--human "$HUMAN_FILE")
fi

if [[ "$HUMAN" == "1" ]]; then
  shopt -s nullglob
  human_files=(ml/data/human-play/*.jsonl)
  shopt -u nullglob
  if [[ ${#human_files[@]} -eq 0 ]]; then
    echo "HUMAN=1 but no human-play files baked into the image (ml/data/human-play/*.jsonl)" >&2
    exit 1
  fi
  for f in "${human_files[@]}"; do
    human_args+=(--human "$f")
  done
  echo "merging ${#human_files[@]} baked human-play files"
fi

if [[ ${#human_args[@]} -gt 0 ]]; then
  train_args+=("${human_args[@]}" --human-weight "$HUMAN_WEIGHT")
fi

echo "training: epochs=$EPOCHS device=$DEVICE shop=$SHOP human=$HUMAN human_key=${HUMAN_KEY:-none}"
python3 ml/train.py "${train_args[@]}"

echo "uploading model -> $OUTPUT_KEY"
yarn dlx tsx scripts/remote/putShard.ts "$MODEL" "$OUTPUT_KEY"
echo "training complete: $OUTPUT_KEY"
