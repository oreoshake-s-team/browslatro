import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from train_rl import normalized_advantages


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


if __name__ == "__main__":
    unittest.main()
