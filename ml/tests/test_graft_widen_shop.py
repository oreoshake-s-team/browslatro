import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from encoding import (
    SHOP_BUILD_FEATURES,
    SHOP_BUILD_WINCON_FEATURES,
    SHOP_CANDIDATE_PACK_FEATURES,
    SHOP_CANDIDATE_WINCON_FEATURES,
    SHOP_INPUT_FEATURES,
    SHOP_INPUT_FEATURES_V2,
)
from graft_widen_shop import carried_columns


class CarriedColumnsTests(unittest.TestCase):
    def test_v2_carries_every_column_except_the_new_pack_features(self):
        cols = carried_columns(SHOP_INPUT_FEATURES_V2, v2=True)
        self.assertEqual(
            len(cols), SHOP_INPUT_FEATURES_V2 - SHOP_CANDIDATE_PACK_FEATURES
        )

    def test_v1_carries_every_column_except_the_new_pack_features(self):
        cols = carried_columns(SHOP_INPUT_FEATURES, v2=False)
        self.assertEqual(
            len(cols), SHOP_INPUT_FEATURES - SHOP_CANDIDATE_PACK_FEATURES
        )

    def test_pack_block_sits_before_the_v2_use_flag(self):
        cols = set(carried_columns(SHOP_INPUT_FEATURES_V2, v2=True))
        use_flag = SHOP_INPUT_FEATURES_V2 - 1
        for i in range(use_flag - SHOP_CANDIDATE_PACK_FEATURES, use_flag):
            self.assertNotIn(i, cols)
        self.assertIn(use_flag, cols)

    def test_candidate_wincon_block_is_carried(self):
        cols = set(carried_columns(SHOP_INPUT_FEATURES_V2, v2=True))
        pack_start = SHOP_INPUT_FEATURES_V2 - 1 - SHOP_CANDIDATE_PACK_FEATURES
        for i in range(pack_start - SHOP_CANDIDATE_WINCON_FEATURES, pack_start):
            self.assertIn(i, cols)

    def test_build_wincon_block_is_carried(self):
        cols = set(carried_columns(SHOP_INPUT_FEATURES_V2, v2=True))
        build_end = 4 + SHOP_BUILD_FEATURES
        for i in range(build_end - SHOP_BUILD_WINCON_FEATURES, build_end):
            self.assertIn(i, cols)

    def test_carried_columns_are_strictly_increasing(self):
        cols = carried_columns(SHOP_INPUT_FEATURES_V2, v2=True)
        self.assertEqual(cols, sorted(cols))

    def test_column_indices_are_within_range(self):
        cols = carried_columns(SHOP_INPUT_FEATURES_V2, v2=True)
        self.assertTrue(all(0 <= c < SHOP_INPUT_FEATURES_V2 for c in cols))


if __name__ == "__main__":
    unittest.main()
