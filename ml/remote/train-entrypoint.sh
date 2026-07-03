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
RL="${RL:-0}"
HUMAN="${HUMAN:-0}"
HUMAN_WEIGHT="${HUMAN_WEIGHT:-5}"
HUMAN_KEY="${HUMAN_KEY:-}"
CORRECTIONS_KEY="${CORRECTIONS_KEY:-}"
CORRECTIONS_WEIGHT="${CORRECTIONS_WEIGHT:-5}"
AGREEMENTS="${AGREEMENTS:-0}"
AGREEMENTS_KEY="${AGREEMENTS_KEY:-}"
AGREEMENTS_WEIGHT="${AGREEMENTS_WEIGHT:-1}"

DATASET="$(mktemp /tmp/dataset-XXXXXX.jsonl)"
MODEL="$(mktemp /tmp/model-XXXXXX.onnx)"

echo "downloading dataset: $DATASET_KEY"
yarn dlx tsx scripts/remote/getObjectCli.ts "$DATASET_KEY" "$DATASET"

if [[ "$RL" == "1" ]]; then
  : "${INIT_KEY:?INIT_KEY is required when RL=1}"
  LR="${LR:-1e-3}"
  PPO_CLIP="${PPO_CLIP:-0.2}"
  V2="${V2:-0}"
  VALUE_BASELINE="${VALUE_BASELINE:-0}"
  VALUE_COEF="${VALUE_COEF:-0.5}"
  REWARD_TO_GO="${REWARD_TO_GO:-0}"
  GAE="${GAE:-}"

  INIT="$(mktemp /tmp/init-XXXXXX.onnx)"
  echo "downloading init policy: $INIT_KEY"
  yarn dlx tsx scripts/remote/getObjectCli.ts "$INIT_KEY" "$INIT"
  if [[ ! -s "$INIT" ]]; then
    echo "init policy object $INIT_KEY is empty" >&2
    exit 1
  fi

  rl_args=("$DATASET" --device "$DEVICE" --init "$INIT" --epochs "$EPOCHS" --lr "$LR" --ppo-clip "$PPO_CLIP" --out "$MODEL")
  if [[ "$V2" == "1" ]]; then
    rl_args+=(--v2)
  fi
  if [[ "$VALUE_BASELINE" == "1" ]]; then
    rl_args+=(--value-baseline --value-coef "$VALUE_COEF")
  fi
  if [[ "$REWARD_TO_GO" == "1" ]]; then
    rl_args+=(--reward-to-go)
  fi
  if [[ -n "$GAE" ]]; then
    rl_args+=(--gae "$GAE")
  fi

  echo "RL training: epochs=$EPOCHS lr=$LR ppo-clip=$PPO_CLIP v2=$V2 value-baseline=$VALUE_BASELINE reward-to-go=$REWARD_TO_GO gae=${GAE:-off} init=$INIT_KEY"
  python3 ml/train_rl.py "${rl_args[@]}"

  echo "uploading model -> $OUTPUT_KEY"
  yarn dlx tsx scripts/remote/putShard.ts "$MODEL" "$OUTPUT_KEY"
  echo "RL training complete: $OUTPUT_KEY"
  exit 0
fi

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

if [[ -n "$CORRECTIONS_KEY" ]]; then
  CORRECTIONS_FILE="$(mktemp /tmp/corrections-XXXXXX.jsonl)"
  echo "downloading gated corrections: $CORRECTIONS_KEY"
  yarn dlx tsx scripts/remote/getObjectCli.ts "$CORRECTIONS_KEY" "$CORRECTIONS_FILE"
  if [[ ! -s "$CORRECTIONS_FILE" ]]; then
    echo "corrections object $CORRECTIONS_KEY is empty" >&2
    exit 1
  fi
  train_args+=(--corrections "$CORRECTIONS_FILE" --corrections-weight "$CORRECTIONS_WEIGHT")
fi

agreements_args=()

if [[ -n "$AGREEMENTS_KEY" ]]; then
  AGREEMENTS_FILE="$(mktemp /tmp/agreements-XXXXXX.jsonl)"
  echo "downloading agreements log: $AGREEMENTS_KEY"
  yarn dlx tsx scripts/remote/getObjectCli.ts "$AGREEMENTS_KEY" "$AGREEMENTS_FILE"
  if [[ ! -s "$AGREEMENTS_FILE" ]]; then
    echo "agreements object $AGREEMENTS_KEY is empty" >&2
    exit 1
  fi
  agreements_args+=(--agreements "$AGREEMENTS_FILE")
fi

if [[ "$AGREEMENTS" == "1" ]]; then
  shopt -s nullglob
  agreement_files=(ml/data/human-play/*.jsonl)
  shopt -u nullglob
  if [[ ${#agreement_files[@]} -eq 0 ]]; then
    echo "AGREEMENTS=1 but no human-play files baked into the image (ml/data/human-play/*.jsonl)" >&2
    exit 1
  fi
  for f in "${agreement_files[@]}"; do
    agreements_args+=(--agreements "$f")
  done
  echo "merging ${#agreement_files[@]} baked agreement sources"
fi

if [[ ${#agreements_args[@]} -gt 0 ]]; then
  train_args+=("${agreements_args[@]}" --agreements-weight "$AGREEMENTS_WEIGHT")
fi

echo "training: epochs=$EPOCHS device=$DEVICE shop=$SHOP human=$HUMAN human_key=${HUMAN_KEY:-none} corrections_key=${CORRECTIONS_KEY:-none} agreements=$AGREEMENTS agreements_key=${AGREEMENTS_KEY:-none}"
python3 ml/train.py "${train_args[@]}"

echo "uploading model -> $OUTPUT_KEY"
yarn dlx tsx scripts/remote/putShard.ts "$MODEL" "$OUTPUT_KEY"
echo "training complete: $OUTPUT_KEY"
