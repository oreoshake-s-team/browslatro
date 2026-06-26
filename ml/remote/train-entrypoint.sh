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

DATASET="$(mktemp /tmp/dataset-XXXXXX.jsonl)"
MODEL="$(mktemp /tmp/model-XXXXXX.onnx)"

echo "downloading dataset: $DATASET_KEY"
yarn dlx tsx scripts/remote/getObjectCli.ts "$DATASET_KEY" "$DATASET"

train_args=("$DATASET" --epochs "$EPOCHS" --device "$DEVICE" --out "$MODEL")
if [[ "$SHOP" == "1" ]]; then
  train_args+=(--shop)
fi

echo "training: epochs=$EPOCHS device=$DEVICE shop=$SHOP"
python3 ml/train.py "${train_args[@]}"

echo "uploading model -> $OUTPUT_KEY"
yarn dlx tsx scripts/remote/putShard.ts "$MODEL" "$OUTPUT_KEY"
echo "training complete: $OUTPUT_KEY"
