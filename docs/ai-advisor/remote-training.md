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
deps on top of the worker image). It uses a dedicated config, `fly.train.toml`,
that pins `dockerfile = "Dockerfile.train"` — `fly deploy`'s `--dockerfile` flag
is overridden by a config's `[build] dockerfile`, so the Dockerfile must be set
in the config, not on the command line:

```bash
fly deploy --config ml/remote/fly.train.toml \
  --build-only --push --image-label train-latest .
export TRAIN_IMAGE=registry.fly.io/browslatro-dataset:train-latest
```

Then train a dataset (the same S3 env vars as generation apply):

```bash
yarn dlx tsx scripts/remote/runRemoteTraining.ts advisor-policy-v10.onnx \
  --dataset dataset.jsonl \
  --run-id 2026-06-26a \
  --epochs 30 \
  --human
```

Add `--shop` to train a shop policy. Pass `--human` (optionally with
`--human-weight N`, default 5) to mix in the checked-in human-play exports the
same way local training does — the entrypoint adds one `--human` per
`ml/data/human-play/*.jsonl` file, so each gets the human weighting. Those files
are baked into the training image (`ml/data/human-play` is the one `ml/data`
subtree the build context keeps), and a `--human` run fails fast if the image
somehow has none. Benchmark the result before shipping with
`scripts/benchmarkPolicy.ts` exactly as for a locally-trained model.

## Running a remote benchmark job

The last step of the loop scores a candidate model on the outcome metrics that
gate shipping (`winRate`, `averageBlindsCleared`). The orchestrator uploads the
candidate, launches one machine that benchmarks it against the built-in greedy
floor (and an optional shipped baseline already in the image), and downloads a
structured JSON summary.

```
runRemoteBenchmark.ts (orchestrator, runs locally)
  │  putObject(candidate) → benchmark/<runId>/candidate.onnx
  │  FlyMachinesClient.run({ exec: benchmark-entrypoint.sh })
  │  poll get() until terminal
  └  getObject(benchmark/<runId>/summary.json) → typed BenchmarkSummary

the Fly machine (ml/remote/Dockerfile worker image + command override)
  │  getObjectCli.ts → /tmp/candidate.onnx
  │  benchmarkPolicy.ts /tmp/candidate.onnx [baseline] … --json /tmp/summary.json
  └  putShard.ts → benchmark/<runId>/summary.json
```

The benchmark worker is pure TypeScript, so it reuses the **dataset worker
image** (`ml/remote/Dockerfile`) — the orchestrator just overrides the launch
command (`MachineRunSpec.exec`) instead of shipping a third image. The
machine-readable summary comes from `benchmarkPolicy.ts --json <path>`.

```bash
yarn dlx tsx scripts/remote/runRemoteBenchmark.ts \
  --model advisor-policy-v10.onnx \
  --run-id 2026-06-26a \
  --baseline public/models/advisor-policy-v9.onnx \
  --games 500 \
  --out summary.json
```

The orchestrator prints `winRate` / `avgBlinds` per agent and (with `--out`)
writes the full `BenchmarkSummary`. Ship only if the candidate beats the
baseline on `averageBlindsCleared`, per `ml-pipeline.md`.

## Preflight and teardown

Every orchestrator runs a **preflight** before launching (or uploading) anything:
it confirms the Fly app is reachable (`FLY_APP`/`FLY_API_TOKEN`) and that the S3
bucket is writable (a tiny `preflight/<runId>.marker` object). A
misconfigured token, app, or bucket fails immediately with one aggregated error
— *before* any machine is started — instead of after a machine has run for a
minute and failed to upload.

Machines are launched with `auto_destroy: true` and `restart: { policy: "no" }`,
so a worker tears itself down when its process exits. After any run — especially
a failed or interrupted one — verify nothing is left billing:

```bash
fly machine list -a "$FLY_APP"

# If a run was interrupted and stragglers remain, destroy them:
fly machine list -a "$FLY_APP" --json \
  | jq -r '.[].id' \
  | xargs -r -n1 fly machine destroy --force -a "$FLY_APP"
```

The preflight marker objects (and any shard/model objects) accumulate in the
bucket; set a lifecycle TTL on the `preflight/`, `datasets/`, `training/`, and
`benchmark/` prefixes (tracked below).

## Deferred / follow-up work

- Chaining **generate → train → benchmark** into a single orchestrated run.
- **Spot/ephemeral retries** and per-shard re-launch on failure.
- **Autoscaling** the machine count to a games-per-minute target.
- **Cost controls**: budget caps, max wall-clock, machine-size presets.
- Wiring the bucket lifecycle (TTL on the `preflight/`, `datasets/`,
  `training/`, and `benchmark/` prefixes).
