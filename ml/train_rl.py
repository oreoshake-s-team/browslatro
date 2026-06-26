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
"""

import argparse
import json
import random

from encoding import SHOP_INPUT_FEATURES, encode_shop_decision


def load_selfplay(paths):
    """Yields (candidate_vectors, sampled_index, game_return) per decision."""
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
                inputs, chosen = encode_shop_decision(record)
                if not inputs or chosen < 0 or chosen >= len(inputs):
                    continue
                decisions.append((inputs, chosen, float(record["return"])))
    return decisions


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
    parser.add_argument("--out", default="advisor-shop-policy-rl.onnx")
    args = parser.parse_args()

    import torch

    from train import CandidateScorer, resolve_device

    random.seed(args.seed)
    torch.manual_seed(args.seed)

    decisions = load_selfplay(args.datasets)
    if not decisions:
        raise SystemExit("no self-play decisions with a return field")
    advantages = normalized_advantages([d[2] for d in decisions], args.adv_clip)
    samples = [(inp, chosen, adv) for (inp, chosen, _), adv in zip(decisions, advantages)]

    device = resolve_device(args.device)
    model = CandidateScorer(SHOP_INPUT_FEATURES, args.hidden).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    print(f"{len(samples)} self-play decisions on {device}")

    for epoch in range(args.epochs):
        random.shuffle(samples)
        total = 0.0
        total_entropy = 0.0
        for i in range(0, len(samples), args.batch_size):
            batch = samples[i : i + args.batch_size]
            optimizer.zero_grad()
            loss = torch.zeros((), device=device)
            batch_entropy = torch.zeros((), device=device)
            for inputs, chosen, adv in batch:
                logits = model(torch.tensor(inputs, dtype=torch.float32, device=device))
                log_probs = torch.nn.functional.log_softmax(logits, dim=0)
                chosen_logp = log_probs[chosen].clamp(min=-args.logp_floor)
                entropy = -(log_probs.exp() * log_probs).sum()
                loss = loss - adv * chosen_logp - args.entropy_coef * entropy
                batch_entropy = batch_entropy + entropy.detach()
            (loss / len(batch)).backward()
            optimizer.step()
            total += float(loss)
            total_entropy += float(batch_entropy)
        n = len(samples)
        print(f"epoch {epoch + 1}: loss={total / n:.4f} entropy={total_entropy / n:.4f}")

    model.eval()
    example = torch.zeros((2, SHOP_INPUT_FEATURES), dtype=torch.float32, device=device)
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
    print(f"exported {args.out} (shop encoding, {SHOP_INPUT_FEATURES} features)")


if __name__ == "__main__":
    main()
