"""Graft an older shop policy into the current (wider) shop encoding.

When the shop encoder gains features, the input layer of the scorer grows and a
plain ``--init`` warm-start fails on a shape mismatch. This tool copies the old
policy's weights into a fresh scorer of the new width, placing every carried-over
column at its new position and zero-filling the newly inserted feature columns.

The result is behaviourally identical to the source policy (zero weight on the new
features contributes nothing), so it can bootstrap both self-play sampling and the
warm-started PPO retrain under the new encoding.
"""

import argparse

import numpy as np
import onnx
import torch
from onnx import numpy_helper

from encoding import (
    SHOP_BUILD_FEATURES,
    SHOP_BUILD_WINCON_FEATURES,
    SHOP_CANDIDATE_WINCON_FEATURES,
    SHOP_INPUT_FEATURES,
    SHOP_INPUT_FEATURES_V2,
)
from train import CandidateScorer


def carried_columns(new_width, v2):
    """New-vector column indices that carry over from the old (narrower) vector.

    The build wincon block sits at the end of the build features; the candidate
    wincon block sits immediately before the trailing v2 use flag (or at the very
    end for v1). Every other column is inherited from the source policy in order.
    """
    build_end = 4 + SHOP_BUILD_FEATURES
    build_wincon = range(build_end - SHOP_BUILD_WINCON_FEATURES, build_end)
    tail = new_width - (1 if v2 else 0)
    cand_wincon = range(tail - SHOP_CANDIDATE_WINCON_FEATURES, tail)
    new_cols = set(build_wincon) | set(cand_wincon)
    return [i for i in range(new_width) if i not in new_cols]


def old_state(onnx_path):
    tensors = {}
    for tensor in onnx.load(onnx_path).graph.initializer:
        tensors[tensor.name] = numpy_helper.to_array(tensor)
    return tensors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--out", required=True)
    parser.add_argument("--hidden", type=int, default=128)
    parser.add_argument("--v2", action="store_true")
    args = parser.parse_args()

    new_width = SHOP_INPUT_FEATURES_V2 if args.v2 else SHOP_INPUT_FEATURES
    tensors = old_state(args.source)
    old_w = tensors["layers.0.weight"]
    hidden, old_width = old_w.shape
    cols = carried_columns(new_width, args.v2)
    if len(cols) != old_width:
        raise SystemExit(
            f"carried columns {len(cols)} != source width {old_width}; "
            "source encoding does not line up with the new one"
        )

    model = CandidateScorer(new_width, hidden)
    state = model.state_dict()
    with torch.no_grad():
        new_w = np.zeros((hidden, new_width), dtype=np.float32)
        new_w[:, cols] = old_w
        state["layers.0.weight"] = torch.tensor(new_w)
        for name, value in tensors.items():
            if name == "layers.0.weight":
                continue
            if name in state:
                state[name] = torch.tensor(value)
    model.load_state_dict(state)
    model.eval()

    example = torch.zeros((2, new_width), dtype=torch.float32)
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
    print(
        f"grafted {args.source} ({old_width}) -> {args.out} ({new_width} features, "
        f"{len(cols)} carried, {new_width - len(cols)} zero-filled)"
    )


if __name__ == "__main__":
    main()
