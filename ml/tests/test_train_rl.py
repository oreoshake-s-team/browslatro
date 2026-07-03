import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from train_rl import (
    clipped_surrogate,
    gae_advantages,
    game_rewards,
    load_selfplay,
    load_selfplay_games,
    masked_entropy,
    masked_log_probs,
    normalized_advantages,
    reward_to_go,
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


class RewardToGoTest(unittest.TestCase):
    def test_subtracts_blinds_already_cleared(self):
        self.assertEqual(reward_to_go(10.0, 4), 6.0)

    def test_an_ante_one_shop_keeps_the_whole_return(self):
        self.assertEqual(reward_to_go(10.0, 0), 10.0)

    def test_never_goes_negative(self):
        self.assertEqual(reward_to_go(3.0, 5), 0.0)

    def test_load_selfplay_applies_reward_to_go_per_decision(self):
        record = {
            "schemaVersion": 2,
            "runSeed": 1,
            "ante": 3,
            "round": 6,
            "blind": 0,
            "money": 8,
            "kind": "purchase",
            "item": {"itemType": "joker", "id": "jolly", "name": "jolly", "cost": 5},
            "offers": [{"itemType": "joker", "id": "jolly", "name": "jolly", "cost": 5}],
            "return": 10.0,
        }
        import json

        with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False) as handle:
            handle.write(json.dumps(record) + "\n")
            path = handle.name
        try:
            plain = load_selfplay([path])
            rtg = load_selfplay([path], use_reward_to_go=True)
        finally:
            os.unlink(path)
        self.assertEqual((plain[0][2], rtg[0][2]), (10.0, 4.0))


class GameRewardsTest(unittest.TestCase):
    def test_credits_each_decision_with_the_blinds_banked_before_the_next(self):
        self.assertEqual(game_rewards([3.0, 4.0, 4.0], 10.0), [1.0, 0.0, 6.0])

    def test_single_decision_earns_the_whole_remaining_return(self):
        self.assertEqual(game_rewards([2.0], 7.0), [5.0])

    def test_terminal_reward_never_goes_negative(self):
        self.assertEqual(game_rewards([5.0], 3.0), [0.0])


class GaeAdvantagesTest(unittest.TestCase):
    def test_lambda_zero_is_pure_one_step_td(self):
        advantages = gae_advantages([1.0, 2.0], [0.5, 1.0], lam=0.0)
        self.assertEqual(advantages, [1.5, 1.0])

    def test_lambda_one_telescopes_to_reward_to_go_minus_value(self):
        rewards = [1.0, 0.0, 2.0]
        values = [0.5, 1.5, 1.0]
        advantages = gae_advantages(rewards, values, lam=1.0)
        for t, adv in enumerate(advantages):
            self.assertAlmostEqual(adv, sum(rewards[t:]) - values[t], places=9)

    def test_perfect_values_yield_zero_advantage_at_any_lambda(self):
        rewards = [1.0, 2.0]
        values = [3.0, 2.0]
        self.assertEqual(gae_advantages(rewards, values, lam=0.5), [0.0, 0.0])

    def test_intermediate_lambda_decays_later_residuals(self):
        advantages = gae_advantages([0.0, 4.0], [0.0, 0.0], lam=0.5)
        self.assertEqual(advantages, [2.0, 4.0])


class LoadSelfplayGamesTest(unittest.TestCase):
    def test_groups_contiguous_records_by_run_seed_in_order(self):
        import json

        def rec(seed, rnd):
            return {
                "schemaVersion": 2,
                "runSeed": seed,
                "ante": 2,
                "round": rnd,
                "blind": 0,
                "money": 8,
                "kind": "purchase",
                "item": {"itemType": "joker", "id": "jolly", "name": "jolly", "cost": 5},
                "offers": [{"itemType": "joker", "id": "jolly", "name": "jolly", "cost": 5}],
                "return": 9.0,
            }

        lines = [rec(1, 2), rec(1, 4), rec(2, 1)]
        with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False) as handle:
            handle.write("\n".join(json.dumps(r) for r in lines) + "\n")
            path = handle.name
        try:
            games = load_selfplay_games([path])
        finally:
            os.unlink(path)
        self.assertEqual(
            [(g["return"], g["rounds"], len(g["decisions"])) for g in games],
            [(9.0, [2.0, 4.0], 2), (9.0, [1.0], 1)],
        )


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
