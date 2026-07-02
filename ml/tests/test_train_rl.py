import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from train_rl import (
    clipped_surrogate,
    masked_entropy,
    masked_log_probs,
    normalized_advantages,
    value_baseline_advantages,
    warm_start,
)

try:
    import onnx  # noqa: F401
    import torch

    from train import CandidateScorer

    HAS_TORCH_ONNX = True
except ImportError:
    HAS_TORCH_ONNX = False


class NormalizedAdvantagesTest(unittest.TestCase):
    def test_clamps_high_outlier_to_positive_clip(self):
        advantages = normalized_advantages([0.0, 0.0, 0.0, 100.0], clip=1.0)
        self.assertEqual(max(advantages), 1.0)

    def test_clamps_low_outlier_to_negative_clip(self):
        advantages = normalized_advantages([0.0, 0.0, 0.0, -100.0], clip=1.0)
        self.assertEqual(min(advantages), -1.0)

    def test_subtracts_mean_baseline_to_center_advantages(self):
        advantages = normalized_advantages([1.0, 2.0, 3.0, 4.0, 5.0], clip=1e9)
        self.assertAlmostEqual(sum(advantages), 0.0, places=6)

    def test_constant_returns_yield_zero_advantage_without_dividing_by_zero(self):
        advantages = normalized_advantages([5.0, 5.0, 5.0], clip=3.0)
        self.assertEqual(advantages, [0.0, 0.0, 0.0])


class ValueBaselineAdvantagesTest(unittest.TestCase):
    def test_perfect_value_predictions_yield_zero_advantage(self):
        advantages = value_baseline_advantages([3.0, 7.0, 5.0], [3.0, 7.0, 5.0], clip=3.0)
        self.assertEqual(advantages, [0.0, 0.0, 0.0])

    def test_same_return_different_state_value_gives_different_credit(self):
        advantages = value_baseline_advantages([4.0, 4.0], [1.0, 4.0], clip=1e9)
        self.assertGreater(advantages[0], advantages[1])

    def test_beating_the_state_baseline_is_positive_advantage(self):
        advantages = value_baseline_advantages([9.0, 1.0], [5.0, 5.0], clip=1e9)
        self.assertGreater(advantages[0], 0.0)

    def test_clamps_a_large_residual_to_the_clip(self):
        advantages = value_baseline_advantages([0.0, 0.0, 0.0, 100.0], [0.0, 0.0, 0.0, 0.0], clip=1.0)
        self.assertEqual(max(advantages), 1.0)

    def test_residuals_are_mean_centered(self):
        advantages = value_baseline_advantages([1.0, 2.0, 3.0], [0.0, 0.0, 0.0], clip=1e9)
        self.assertAlmostEqual(sum(advantages), 0.0, places=6)


class ClippedSurrogateTest(unittest.TestCase):
    def test_caps_good_action_gain_at_the_upper_clip(self):
        self.assertAlmostEqual(clipped_surrogate(2.0, 1.0, 0.2), 1.2)

    def test_leaves_bad_action_ratio_unclipped_below(self):
        self.assertAlmostEqual(clipped_surrogate(2.0, -1.0, 0.2), -2.0)

    def test_unit_ratio_passes_advantage_through(self):
        self.assertAlmostEqual(clipped_surrogate(1.0, 0.75, 0.2), 0.75)


@unittest.skipUnless(HAS_TORCH_ONNX, "warm_start needs torch + onnx")
class WarmStartTest(unittest.TestCase):
    def _export(self, model, path):
        model.eval()
        torch.onnx.export(
            model,
            (torch.zeros((2, 78), dtype=torch.float32),),
            path,
            input_names=["candidates"],
            output_names=["logits"],
            dynamic_axes={"candidates": {0: "n"}, "logits": {0: "n"}},
            opset_version=18,
            external_data=False,
        )

    def test_warm_start_restores_every_parameter_from_onnx(self):
        torch.manual_seed(1)
        source = CandidateScorer(78, 128)
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "src.onnx")
            self._export(source, path)
            target = CandidateScorer(78, 128)
            warm_start(target, path, torch.device("cpu"), torch)
        same = all(
            torch.equal(source.state_dict()[k], target.state_dict()[k])
            for k in source.state_dict()
        )
        self.assertTrue(same)

    def test_warm_start_returns_full_parameter_count(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "src.onnx")
            self._export(CandidateScorer(78, 128), path)
            target = CandidateScorer(78, 128)
            loaded = warm_start(target, path, torch.device("cpu"), torch)
        self.assertEqual(loaded, len(target.state_dict()))


@unittest.skipUnless(HAS_TORCH_ONNX, "masked entropy needs torch")
class MaskedEntropyTest(unittest.TestCase):
    def test_padded_candidates_keep_entropy_finite(self):
        logits = torch.tensor([[1.0, 2.0, 0.5], [0.3, 1.5, 0.0]])
        mask = torch.tensor([[True, True, True], [True, True, False]])
        entropy = masked_entropy(masked_log_probs(logits, mask), mask)
        self.assertTrue(bool(torch.isfinite(entropy).all()))

    def test_padded_candidates_keep_the_gradient_finite(self):
        logits = torch.tensor([[0.3, 1.5, 0.0]], requires_grad=True)
        mask = torch.tensor([[True, True, False]])
        masked_entropy(masked_log_probs(logits, mask), mask).sum().backward()
        self.assertTrue(bool(torch.isfinite(logits.grad).all()))

    def test_padding_does_not_change_entropy_versus_the_real_candidate_set(self):
        padded = masked_entropy(
            masked_log_probs(torch.tensor([[0.3, 1.5, 0.0]]), torch.tensor([[True, True, False]])),
            torch.tensor([[True, True, False]]),
        )
        unpadded = masked_entropy(
            masked_log_probs(torch.tensor([[0.3, 1.5]]), torch.tensor([[True, True]])),
            torch.tensor([[True, True]]),
        )
        self.assertAlmostEqual(float(padded[0]), float(unpadded[0]), places=6)


if __name__ == "__main__":
    unittest.main()
