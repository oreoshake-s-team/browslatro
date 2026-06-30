"""Self-play REINFORCE for the shop policy.

Reads self-play records (shop/pack RunEventRecords augmented with a ``return``
field — the final outcome of the game the decision belonged to) and updates the
CandidateScorer by policy gradient: increase the log-probability of sampled
actions that beat the baseline return, decrease it for those below.

This is the outcome-based counterpart to the supervised rollout teacher: there
is no "correct" label, only the realised return of the action that was actually
sampled, so leaving / rerolling are rewarded exactly when they led to a better
game.

Stabilizers (an unguarded signed-advantage cross-entropy diverges: negative
advantages drive the chosen log-prob to -inf and collapse the policy):
  * value baseline + standardized, tail-clamped advantages (``--adv-clip``);
  * a log-prob floor (``--logp-floor``) bounding the per-decision update;
  * an entropy bonus (``--entropy-coef``) keeping the policy stochastic.

``--init <onnx>`` warm-starts the scorer from an existing shop policy (its ONNX
initializers are named like the torch state_dict, so the load is by-name). This
is what makes *on-policy* iteration possible: warm-start from the policy that
generated the self-play data so the gradient improves that policy in place.

With ``--init`` set, ``--ppo-clip`` adds a PPO trust region: the warm-started
model is also the behaviour policy, so each decision's old action-probability is
known, and clipping the new/old ratio keeps every round's update close to the
sampling policy. This is what stops on-policy iteration from overshooting and
oscillating between behaviour modes; ``--ppo-clip 0`` falls back to REINFORCE.
"""

import argparse
import json
import random

from encoding import (
    SHOP_INPUT_FEATURES,
    SHOP_INPUT_FEATURES_V2,
    encode_shop_decision,
    encode_shop_decision_v2,
)


def load_selfplay(paths, v2=False):
    """Yields (candidate_vectors, sampled_index, game_return) per decision."""
    encode = encode_shop_decision_v2 if v2 else encode_shop_decision
    decisions = []
    for path in paths:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                record = json.loads(line)
                if "return" not in record:
                    continue
                inputs, chosen = encode(record)
                if not inputs or chosen < 0 or chosen >= len(inputs):
                    continue
                decisions.append((inputs, chosen, float(record["return"])))
    return decisions


def warm_start(model, onnx_path, device, torch):
    """Load named initializers from an onnx shop policy into ``model``.

    The exported scorer's ONNX initializers are named like the torch state_dict
    (``layers.0.weight`` ...), so the load is by-name. Raises if any parameter is
    missing or shape-mismatched so a stale/incompatible checkpoint fails loudly
    rather than silently warm-starting from a random init.
    """
    import onnx
    from onnx import numpy_helper

    state = model.state_dict()
    loaded = 0
    for tensor in onnx.load(onnx_path).graph.initializer:
        if tensor.name not in state:
            continue
        weights = torch.tensor(
            numpy_helper.to_array(tensor), dtype=torch.float32, device=device
        )
        if weights.shape != state[tensor.name].shape:
            raise SystemExit(
                f"--init shape mismatch for {tensor.name}: "
                f"{tuple(weights.shape)} vs {tuple(state[tensor.name].shape)}"
            )
        state[tensor.name] = weights
        loaded += 1
    if loaded != len(state):
        raise SystemExit(
            f"--init only matched {loaded}/{len(state)} parameters in {onnx_path}"
        )
    model.load_state_dict(state)
    return loaded


def normalized_advantages(returns, clip):
    """Standardize returns against the mean baseline, then clamp the tails.

    The constant mean is the value baseline: advantage = return - E[return].
    Clamping bounds how large a single high/low-return decision can push the
    policy, which (together with the log-prob floor and the entropy bonus in the
    loss) keeps REINFORCE from collapsing to a degenerate deterministic policy.
    """
    mean = sum(returns) / len(returns)
    var = sum((r - mean) ** 2 for r in returns) / len(returns)
    std = max(var ** 0.5, 1e-6)
    return [max(-clip, min(clip, (r - mean) / std)) for r in returns]


def clipped_surrogate(ratio, advantage, clip):
    """PPO surrogate for one decision: ``min(r*A, clamp(r, 1±clip)*A)``.

    ``ratio`` is the new/old action-probability ratio. Clipping the ratio keeps
    each round's update inside a trust region around the policy that generated
    the self-play, which is what stops the on-policy iteration from overshooting
    and oscillating between behaviour modes. The reference for the torch loop;
    kept pure so it is unit-testable without torch.
    """
    clamped = max(1.0 - clip, min(1.0 + clip, ratio))
    return min(ratio * advantage, clamped * advantage)


def masked_log_probs(logits, mask):
    """Row-wise log-softmax over a ragged, padded candidate batch.

    Padded candidates (``mask`` False) are set to -inf before the softmax, so
    ``exp(-inf)=0`` leaves them out of the denominator — identical to scoring
    each decision on its own ragged candidate set.
    """
    import torch

    return torch.nn.functional.log_softmax(logits.masked_fill(~mask, float("-inf")), dim=1)


def masked_entropy(log_probs, mask):
    """Per-decision entropy that ignores padded candidates.

    Padded log-probs are -inf, so ``p * log p`` would be ``0 * -inf = nan`` (and
    its gradient nan). Replacing the *log-prob* factor with 0 at padded positions
    keeps both the value and the gradient finite while leaving real candidates
    untouched.
    """
    return -(log_probs.exp() * log_probs.masked_fill(~mask, 0.0)).sum(dim=1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("datasets", nargs="+")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--hidden", type=int, default=128)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--entropy-coef", type=float, default=0.01)
    parser.add_argument("--adv-clip", type=float, default=3.0)
    parser.add_argument("--logp-floor", type=float, default=10.0)
    parser.add_argument(
        "--init",
        default=None,
        help="warm-start CandidateScorer from an existing shop-policy onnx",
    )
    parser.add_argument(
        "--ppo-clip",
        type=float,
        default=0.2,
        help="PPO trust-region clip; needs --init (the old policy). 0 disables (plain REINFORCE)",
    )
    parser.add_argument(
        "--v2",
        action="store_true",
        help="use the use-aware shop encoding (79 features) for a v11+ policy",
    )
    parser.add_argument("--out", default="advisor-shop-policy-rl.onnx")
    args = parser.parse_args()

    import copy

    import torch

    from train import CandidateScorer, resolve_device

    random.seed(args.seed)
    torch.manual_seed(args.seed)

    features = SHOP_INPUT_FEATURES_V2 if args.v2 else SHOP_INPUT_FEATURES
    decisions = load_selfplay(args.datasets, v2=args.v2)
    if not decisions:
        raise SystemExit("no self-play decisions with a return field")
    advantages = normalized_advantages([d[2] for d in decisions], args.adv_clip)
    samples = [(inp, chosen, adv) for (inp, chosen, _), adv in zip(decisions, advantages)]

    device = resolve_device(args.device)
    model = CandidateScorer(features, args.hidden).to(device)
    if args.init:
        loaded = warm_start(model, args.init, device, torch)
        print(f"warm-started {loaded} tensors from {args.init}")

    use_ppo = bool(args.init) and args.ppo_clip > 0
    # Each decision has a ragged candidate set, so a minibatch is padded to the
    # batch's max candidate count and the padding is masked to -inf before the
    # softmax (exp(-inf)=0, so it contributes nothing). This is numerically
    # equivalent to scoring each decision on its own, but runs as one batched
    # forward instead of a Python loop over decisions.
    def pad_batch(batch_idx):
        rows = [samples[j] for j in batch_idx]
        max_n = max(len(inp) for inp, _, _ in rows)
        feats = len(rows[0][0][0])
        size = len(rows)
        x = torch.zeros((size, max_n, feats), dtype=torch.float32, device=device)
        mask = torch.zeros((size, max_n), dtype=torch.bool, device=device)
        chosen = torch.empty(size, dtype=torch.long, device=device)
        adv = torch.empty(size, dtype=torch.float32, device=device)
        for b, (inp, ch, ad) in enumerate(rows):
            n = len(inp)
            x[b, :n] = torch.tensor(inp, dtype=torch.float32, device=device)
            mask[b, :n] = True
            chosen[b] = ch
            adv[b] = ad
        return x, mask, chosen, adv

    def chosen_log_probs(log_probs, chosen):
        return log_probs.gather(1, chosen.unsqueeze(1)).squeeze(1)

    old_logps = None
    if use_ppo:
        old_model = copy.deepcopy(model).to(device)
        old_model.eval()
        old_logps = [0.0] * len(samples)
        with torch.no_grad():
            for i in range(0, len(samples), args.batch_size):
                batch = list(range(i, min(i + args.batch_size, len(samples))))
                x, mask, chosen, _ = pad_batch(batch)
                lp = chosen_log_probs(masked_log_probs(old_model(x), mask), chosen)
                for k, j in enumerate(batch):
                    old_logps[j] = float(lp[k])
        print(f"PPO trust region clip={args.ppo_clip} (old policy = {args.init})")
    else:
        print("plain REINFORCE (no --init / --ppo-clip 0)")

    indexed = list(range(len(samples)))
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    print(f"{len(samples)} self-play decisions on {device}")

    for epoch in range(args.epochs):
        random.shuffle(indexed)
        total = 0.0
        total_entropy = 0.0
        for i in range(0, len(indexed), args.batch_size):
            batch = indexed[i : i + args.batch_size]
            optimizer.zero_grad()
            x, mask, chosen, adv = pad_batch(batch)
            log_probs = masked_log_probs(model(x), mask)
            chosen_logp = chosen_log_probs(log_probs, chosen)
            entropy = masked_entropy(log_probs, mask)
            if use_ppo:
                old_lp = torch.tensor([old_logps[j] for j in batch], dtype=torch.float32, device=device)
                ratio = torch.exp(chosen_logp - old_lp)
                surrogate = torch.min(
                    ratio * adv,
                    torch.clamp(ratio, 1.0 - args.ppo_clip, 1.0 + args.ppo_clip) * adv,
                )
                per_decision = -surrogate - args.entropy_coef * entropy
            else:
                clamped = chosen_logp.clamp(min=-args.logp_floor)
                per_decision = -adv * clamped - args.entropy_coef * entropy
            loss = per_decision.sum()
            (loss / len(batch)).backward()
            optimizer.step()
            total += float(loss)
            total_entropy += float(entropy.sum())
        n = len(samples)
        print(f"epoch {epoch + 1}: loss={total / n:.4f} entropy={total_entropy / n:.4f}")

    model.eval()
    example = torch.zeros((2, features), dtype=torch.float32, device=device)
    torch.onnx.export(
        model,
        (example,),
        args.out,
        input_names=["candidates"],
        output_names=["logits"],
        dynamic_axes={"candidates": {0: "n"}, "logits": {0: "n"}},
        opset_version=18,
        external_data=False,
    )
    print(f"exported {args.out} (shop encoding, {features} features)")


if __name__ == "__main__":
    main()
