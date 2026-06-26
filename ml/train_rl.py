"""Self-play REINFORCE for the shop policy.

Reads self-play records (shop/pack RunEventRecords augmented with a ``return``
field — the final outcome of the game the decision belonged to) and updates the
CandidateScorer by policy gradient: increase the log-probability of sampled
actions that beat the baseline return, decrease it for those below.

This is the outcome-based counterpart to the supervised rollout teacher: there
is no "correct" label, only the realised return of the action that was actually
sampled, so leaving / rerolling are rewarded exactly when they led to a better
game.
"""

import argparse
import json
import random

import torch

from encoding import SHOP_INPUT_FEATURES, encode_shop_decision
from train import CandidateScorer, resolve_device


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


def normalized_advantages(returns):
    mean = sum(returns) / len(returns)
    var = sum((r - mean) ** 2 for r in returns) / len(returns)
    std = max(var ** 0.5, 1e-6)
    return [(r - mean) / std for r in returns]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("datasets", nargs="+")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--hidden", type=int, default=128)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--out", default="advisor-shop-policy-rl.onnx")
    args = parser.parse_args()

    random.seed(args.seed)
    torch.manual_seed(args.seed)

    decisions = load_selfplay(args.datasets)
    if not decisions:
        raise SystemExit("no self-play decisions with a return field")
    advantages = normalized_advantages([d[2] for d in decisions])
    samples = [(inp, chosen, adv) for (inp, chosen, _), adv in zip(decisions, advantages)]

    device = resolve_device(args.device)
    model = CandidateScorer(SHOP_INPUT_FEATURES, args.hidden).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    print(f"{len(samples)} self-play decisions on {device}")

    for epoch in range(args.epochs):
        random.shuffle(samples)
        total = 0.0
        for i in range(0, len(samples), args.batch_size):
            batch = samples[i : i + args.batch_size]
            optimizer.zero_grad()
            loss = torch.zeros((), device=device)
            for inputs, chosen, adv in batch:
                logits = model(torch.tensor(inputs, dtype=torch.float32, device=device))
                loss = loss + adv * torch.nn.functional.cross_entropy(
                    logits.unsqueeze(0),
                    torch.tensor([chosen], device=device),
                )
            (loss / len(batch)).backward()
            optimizer.step()
            total += float(loss)
        print(f"epoch {epoch + 1}: loss={total / len(samples):.4f}")

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
