import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  encodePackCandidatesV2,
  encodeShopCandidatesV2,
  SHOP_INPUT_FEATURES_V2,
} from "../src/ai/advisor/shopEncoding";
import type { PackRankInput, ShopRankInput } from "../src/ai/advisor/shopEncoding";
import {
  GOLDEN_INPUTS,
  goldenChosenIndex,
  recordToInput,
  type GoldenCase,
  type GoldenRecord,
} from "../src/ai/advisor/shopGoldenRecords";

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "ml",
  "tests",
  "fixtures",
  "shop-golden.json",
);

function encode(rec: GoldenRecord): ReadonlyArray<ReadonlyArray<number>> {
  const input = recordToInput(rec);
  const flat =
    rec.kind === "pack-pick"
      ? encodePackCandidatesV2(input as PackRankInput)
      : encodeShopCandidatesV2(input as ShopRankInput);
  const rows: number[][] = [];
  for (let i = 0; i < flat.length; i += SHOP_INPUT_FEATURES_V2) {
    rows.push(Array.from(flat.slice(i, i + SHOP_INPUT_FEATURES_V2)));
  }
  return rows;
}

const cases: GoldenCase[] = GOLDEN_INPUTS.map((record) => ({
  record,
  candidates: encode(record),
  chosenIndex: goldenChosenIndex(record),
}));

writeFileSync(OUT, `${JSON.stringify(cases, null, 2)}\n`);
process.stdout.write(
  `Wrote ${cases.length} V2 golden cases (${SHOP_INPUT_FEATURES_V2} features/candidate) to ${OUT}\n`,
);
