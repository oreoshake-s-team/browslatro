# Remote dataset generation on rented vCPUs

Dataset generation (`scripts/generateDataset.ts`) is the CPU-bound, embarrassingly
parallel step of the ML pipeline: each game is an independent headless self-play
rollout, and the search expert spends almost all of its time in Monte-Carlo
rollouts. Training (`ml/train.py`) is small and fast by comparison. This page
documents the first increment of running generation across many **rented Fly.io
machines** instead of a single workstation.

> Scope of this increment: **dataset generation only**, with a Tigris/S3 bucket as
> the artifact transport. Remote training, benchmarking, autoscaling, spot
> retries, and cost controls are tracked as follow-up issues.

## How it fits together

```
runRemoteDataset.ts (orchestrator, runs locally)
  │  planShards()  ── deterministic seed slicing (reuses sliceJobs)
  │  for each shard:
  │    FlyMachinesClient.run() ── start one ephemeral machine
  │    poll get() until "stopped"/"destroyed"
  │    getObject() ── download the shard from S3
  └  concatenate shards in index order → dataset.jsonl

each Fly machine (ml/remote/Dockerfile + worker-entrypoint.sh)
  │  generateDataset.ts → /tmp/shard.jsonl   (its seed slice)
  └  putShard.ts → S3 object  datasets/<runId>/shard-<i>.jsonl
```

The machine is never the source of truth for output — **the S3 object is**. If a
machine stops without writing a non-empty shard, the orchestrator fails fast
rather than shipping a partial dataset (no greedy "use what we have" fallback).

Sharding is fully deterministic: `planShards()` reuses `sliceJobs()` from
`generateDataset.ts`, so the same `--run-id`, `--games`, `--machines`, and
`--seed-offset` reproduce the exact same per-shard seed ranges, whether run
locally with `--parallel-jobs` or remotely across machines.

### Modules

| File | Role |
| --- | --- |
| `scripts/remote/shardPlan.ts` | Deterministic shard plan (seed slices + object keys). |
| `scripts/remote/flyMachines.ts` | `MachineLauncher` interface + `FlyMachinesClient` over the Fly Machines REST API. |
| `scripts/remote/s3.ts` | Dependency-free SigV4 signing + `putObject`/`getObject` for any S3-compatible store (Tigris). |
| `scripts/remote/runRemoteDataset.ts` | Orchestrator: plan → launch → poll → collect → concatenate. |
| `scripts/remote/putShard.ts` | Worker-side uploader invoked inside the container. |
| `ml/remote/Dockerfile` | Worker image (Node 22 + repo + deps). |
| `ml/remote/worker-entrypoint.sh` | Generates a shard, then uploads it. |
| `ml/remote/fly.toml` | Fly app/build config for the worker image. |

## One-time setup

1. **Create the Fly app and a Tigris bucket:**

   ```bash
   fly apps create browslatro-dataset
   fly storage create   # provisions a Tigris bucket, prints S3 credentials
   ```

2. **Build and push the worker image** (build context is the repo root so the
   Dockerfile can copy the whole repo):

   ```bash
   fly deploy --config ml/remote/fly.toml --dockerfile ml/remote/Dockerfile \
     --build-only --push --image-label dataset-latest .
   ```

   Note the resulting image reference (e.g.
   `registry.fly.io/browslatro-dataset:dataset-latest`).

## Running a remote generation job

Export the credentials the orchestrator needs (the same S3 values are forwarded
to each worker as machine env):

```bash
export FLY_API_TOKEN=$(fly auth token)
export FLY_APP=browslatro-dataset
export DATASET_IMAGE=registry.fly.io/browslatro-dataset:dataset-latest

export AWS_ENDPOINT_URL_S3=https://fly.storage.tigris.dev
export AWS_REGION=auto
export BROWSLATRO_DATASET_BUCKET=<your-bucket>
export AWS_ACCESS_KEY_ID=<tigris-key>
export AWS_SECRET_ACCESS_KEY=<tigris-secret>
```

Then launch a sharded run:

```bash
yarn dlx tsx scripts/remote/runRemoteDataset.ts dataset.jsonl \
  --run-id 2026-06-26a \
  --games 2000 \
  --machines 8 \
  --cpus 4 --memory-mb 2048 \
  --shop-policy public/models/advisor-shop-policy-v8.onnx
```

The orchestrator starts 8 machines (each generating ~250 games), waits for all
of them to finish and upload, downloads the shards, and writes the concatenated
`dataset.jsonl`. Train on it exactly as with a locally-generated dataset — see
[`ml-pipeline.md`](./ml-pipeline.md) and [`running-locally.md`](./running-locally.md).

### Configuration reference

| Env var | Purpose |
| --- | --- |
| `FLY_API_TOKEN` | Fly Machines API auth (orchestrator). |
| `FLY_APP` | Fly app that owns the machines. |
| `DATASET_IMAGE` | Worker image reference (overridable with `--image`). |
| `AWS_ENDPOINT_URL_S3` | S3 endpoint (`https://fly.storage.tigris.dev` for Tigris). |
| `AWS_REGION` | S3 region (Tigris uses `auto`). |
| `BROWSLATRO_DATASET_BUCKET` | Bucket holding shard objects. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | S3 credentials. |

## Running a remote training job

Generation ships a `dataset.jsonl` back; training takes one back to an ONNX
policy. Training is single-threaded PyTorch (one machine, no sharding): the
orchestrator uploads the dataset to S3, launches one machine that downloads it,
runs `ml/train.py` on CPU, uploads the `.onnx`, and the orchestrator downloads
the model.

```
runRemoteTraining.ts (orchestrator, runs locally)
  │  putObject(dataset) → training/<runId>/dataset.jsonl
  │  FlyMachinesClient.run() ── one machine
  │  poll get() until terminal
  └  getObject(training/<runId>/model.onnx) → local <out.onnx>

the Fly machine (ml/remote/Dockerfile.train + train-entrypoint.sh)
  │  getObjectCli.ts  → /tmp/dataset.jsonl
  │  python3 ml/train.py … --device cpu --out /tmp/model.onnx
  └  putShard.ts → training/<runId>/model.onnx
```

As with generation, the S3 object is the source of truth: if the machine stops
without exporting a non-empty model the orchestrator fails fast.

Build and push the training image (it adds Python + the `ml/requirements.txt`
deps on top of the worker image):

```bash
fly deploy --config ml/remote/fly.toml --dockerfile ml/remote/Dockerfile.train \
  --build-only --push --image-label train-latest .
export TRAIN_IMAGE=registry.fly.io/browslatro-dataset:train-latest
```

Then train a dataset (the same S3 env vars as generation apply):

```bash
yarn dlx tsx scripts/remote/runRemoteTraining.ts advisor-policy-v10.onnx \
  --dataset dataset.jsonl \
  --run-id 2026-06-26a \
  --epochs 30
```

Add `--shop` to train a shop policy. Benchmark the result before shipping with
`scripts/benchmarkPolicy.ts` exactly as for a locally-trained model.

## Deferred / follow-up work

- Remote **benchmarking** (run `benchmarkPolicy.ts` on a machine and return the
  outcome metrics that gate shipping).
- Merging **human-play data** (`--human`) into remote training (needs the data
  uploaded or baked into the training image).
- **Spot/ephemeral retries** and per-shard re-launch on failure.
- **Autoscaling** the machine count to a games-per-minute target.
- **Cost controls**: budget caps, max wall-clock, machine-size presets.
- Wiring the bucket lifecycle (TTL on `datasets/<runId>/` prefixes).
