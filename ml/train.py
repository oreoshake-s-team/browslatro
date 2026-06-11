"""Trains the advisor candidate scorer and exports it to ONNX.

Usage:
    python train.py <dataset.jsonl> [more.jsonl ...] [--human play.jsonl] [--human-weight 5] [--epochs 30] [--out advisor-policy.onnx]

The model scores one (state, candidate) vector at a time; a decision is
made by running every candidate through the net and taking the argmax.
The ONNX export has input "candidates" of shape [N, INPUT_FEATURES] and
output "logits" of shape [N], so the browser runtime (issue #1055) feeds
all candidates of a decision in one call.
"""

import argparse
import random
import sys

import torch
from torch import nn

from dataset import load_all, split_by_seed
from encoding import ENCODING_VERSION, INPUT_FEATURES


class CandidateScorer(nn.Module):
    def __init__(self, hidden):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(INPUT_FEATURES, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden // 2),
            nn.ReLU(),
            nn.Linear(hidden // 2, 1),
        )

    def forward(self, candidates):
        return self.layers(candidates).squeeze(-1)


def decision_loss(model, decision):
    inputs, chosen, weight = decision
    logits = model(torch.tensor(inputs, dtype=torch.float32))
    return weight * nn.functional.cross_entropy(
        logits.unsqueeze(0), torch.tensor([chosen])
    )


def accuracy(model, decisions):
    if not decisions:
        return 0.0
    correct = 0
    with torch.no_grad():
        for inputs, chosen, _ in decisions:
            logits = model(torch.tensor(inputs, dtype=torch.float32))
            if int(torch.argmax(logits)) == chosen:
                correct += 1
    return correct / len(decisions)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("datasets", nargs="+")
    parser.add_argument("--human", action="append", default=[])
    parser.add_argument("--human-weight", type=float, default=5.0)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--hidden", type=int, default=128)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--out", default="advisor-policy.onnx")
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    random.seed(args.seed)

    train, validation = split_by_seed(load_all(args.datasets))
    if not train or not validation:
        sys.exit(f"dataset too small: {len(train)} train / {len(validation)} validation")
    human = load_all(args.human, args.human_weight)
    train = train + [(inputs, chosen, weight) for inputs, chosen, _, weight in human]
    print(
        f"{len(train)} train decisions ({len(human)} human at "
        f"weight {args.human_weight}), {len(validation)} validation decisions"
    )

    model = CandidateScorer(args.hidden)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    for epoch in range(args.epochs):
        random.shuffle(train)
        total = 0.0
        for decision in train:
            optimizer.zero_grad()
            loss = decision_loss(model, decision)
            loss.backward()
            optimizer.step()
            total += float(loss)
        print(
            f"epoch {epoch + 1}: loss={total / len(train):.4f} "
            f"val_acc={accuracy(model, validation):.3f}"
        )

    print(f"final: train_acc={accuracy(model, train):.3f} val_acc={accuracy(model, validation):.3f}")

    model.eval()
    example = torch.zeros((2, INPUT_FEATURES), dtype=torch.float32)
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
    print(f"exported {args.out} (encoding v{ENCODING_VERSION}, {INPUT_FEATURES} features)")


if __name__ == "__main__":
    main()
