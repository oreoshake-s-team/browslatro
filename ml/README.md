# Advisor policy training

Imitation-learning pipeline for the AI advisor (issue #966, trained-model path).
A small MLP learns to rank the engine's candidate plays/discards by imitating
the Monte-Carlo search expert (`src/ai/searchAgent.ts`).

This directory is plain Python and is not part of the yarn build. The
dependency-free encoding tests run in CI; training itself runs locally.

## Pipeline

1. **Generate a dataset** (TypeScript, from the repo root):

   ```sh
   yarn dlx tsx scripts/generateDataset.ts dataset.jsonl --games 500
   ```

   One JSON line per expert decision: the serialized `ModelState`, the
   candidate list from `getHandOptions`, and which candidate the search
   expert chose (`schemaVersion: 1`).

   **Optionally add your own play.** The game records every play/discard
   decision you make (same schema). In the game, open *Apply modifiers* →
   *Export log* to download `browslatro-human-play.jsonl`. Human play
   covers state space the headless generator never produces — real jokers,
   bosses, and economies.

   Exported rounds are checked in under `ml/data/human-play/` (one dated
   file per export) so retraining runs accumulate every round. Exports may
   interleave schemaVersion 2 run events (purchases, pack picks) and
   decisions the fixed-size encoding cannot represent (hands wider than
   `HAND_SLOTS`); the loader skips both and reports the skipped-decision count.

2. **Train and export** (Python 3.11+):

   ```sh
   cd ml
   python3 -m venv .venv && . .venv/bin/activate
   pip install -r requirements.txt
   python train.py ../dataset.jsonl --epochs 30 --out advisor-policy.onnx
   ```

   `train.py` accepts any number of dataset files. Pass in-game exports
   via `--human` so they train at a higher per-decision weight (default 5x,
   tunable with `--human-weight`) — human play is scarce and covers state
   space the generator never reaches, so each decision should count for
   more than one expert rollout:

   ```sh
   python train.py ../dataset.jsonl --human ../browslatro-human-play.jsonl --out advisor-policy.onnx
   ```

   Positional files train at weight 1; the weight scales the cross-entropy
   loss per decision. Human files are never held out: the train/validation
   split (keyed on `runSeed`) applies to the generated set only, so every
   human decision trains and validation accuracy stays an unweighted
   measure against the search expert.

   **Distilled LLM teacher labels.** `scripts/labelDisagreements.ts` relabels
   the states where the ONNX policy disagrees with the search expert using the
   LLM advisor as an offline teacher, emitting the same `schemaVersion: 1`
   format. Pass that output via `--teacher` to fold the teacher's judgment into
   the student. Teacher labels train at their own weight (default 5x, tunable
   with `--teacher-weight`), independent of `--human-weight`, and like human
   play are never held out — they exist precisely *because* they disagree with
   the expert, so validation accuracy (measured against the expert) is the
   wrong success signal for them. Select the shipped model on the outcome
   metric from `scripts/benchmarkPolicy.ts` instead.

   ```sh
   python train.py ../dataset.jsonl --teacher ../teacher-labels.jsonl --teacher-weight 5 --out advisor-policy.onnx
   ```

   Reports per-epoch loss and validation accuracy versus the expert
   (train/validation split is by run seed so games never straddle the split),
   then exports ONNX: input `candidates` of shape `[N, INPUT_FEATURES]`,
   output `logits` of shape `[N]` — one row per candidate of a decision,
   argmax picks the move.

3. **Benchmark before shipping** (TypeScript, from the repo root):

   ```sh
   yarn dlx tsx scripts/benchmarkPolicy.ts public/models/advisor-policy-v1.onnx ml/candidate.onnx --games 500 --seed-offset 5000
   ```

   Evaluates each model (plus the greedy baseline) as a headless agent over
   the same seed batch and prints win rate, average ante reached, average
   blinds cleared, and average hands played. Keep the eval seeds disjoint
   from the generated training seeds (`--seed-offset`), and only ship a
   candidate that beats the current model on average blinds cleared.

   **One-command distillation cycle.** `scripts/distillPolicy.ts` runs the whole
   loop — label disagreements with the LLM teacher, train with `--teacher`,
   benchmark the candidate against the current model, and print a `SHIP`/`HOLD`
   verdict on average blinds cleared:

   ```sh
   ANTHROPIC_API_KEY=sk-... yarn dlx tsx scripts/distillPolicy.ts \
     --base ml/dataset.jsonl --model public/models/advisor-policy-v5.onnx \
     --out ml/candidate.onnx --teacher-weight 5 --min-score-fraction 0.25 \
     --games 500 --seed-offset 5000 --python python3
   ```

   `--dry-run` swaps the LLM teacher for a local best-play stand-in, so the full
   label → train → benchmark wiring can be validated with no API spend. The
   verdict only reports `SHIP` when the candidate strictly beats the current
   model, so a worse run is never promoted.

4. **Run in the browser** — issue #1055 consumes the exported model with
   onnxruntime-web. The browser-side encoder must match `encoding.py`
   byte-for-byte; `ENCODING_VERSION` is bumped on any change, and the
   fixture under `tests/fixtures/` (generated by the TypeScript CLI) pins
   the cross-language contract.

## Tests

```sh
python3 -m unittest discover -s ml/tests   # from the repo root; stdlib only
```
