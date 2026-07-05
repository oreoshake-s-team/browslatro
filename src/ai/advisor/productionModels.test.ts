// @vitest-environment node
import { existsSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  HAND_MODEL_ID,
  HAND_MODEL_REPO_PATH,
  HAND_MODEL_URL,
  SHOP_MODEL_ID,
  SHOP_MODEL_REPO_PATH,
  SHOP_MODEL_SERVING_URL,
} from "./productionModels";
import { ADVISOR_MODEL_URL, ADVISOR_POLICY_MODEL_ID } from "./advisorRanker";
import { SHOP_MODEL_URL, SHOP_POLICY_MODEL_ID } from "./shopRanker";

describe("productionModels", () => {
  test("the hand model repo path points at a committed model", () => {
    expect(existsSync(HAND_MODEL_REPO_PATH)).toBe(true);
  });

  test("the shop model repo path points at a committed model", () => {
    expect(existsSync(SHOP_MODEL_REPO_PATH)).toBe(true);
  });

  test("the serving ranker urls derive from the same source of truth", () => {
    expect([ADVISOR_MODEL_URL, SHOP_MODEL_URL]).toEqual([
      HAND_MODEL_URL,
      SHOP_MODEL_SERVING_URL,
    ]);
  });

  test("the model ids derive from the file names", () => {
    expect([ADVISOR_POLICY_MODEL_ID, SHOP_POLICY_MODEL_ID]).toEqual([
      HAND_MODEL_ID,
      SHOP_MODEL_ID,
    ]);
  });

  test("serving urls and repo paths reference the same files", () => {
    expect(HAND_MODEL_REPO_PATH.endsWith(HAND_MODEL_URL)).toBe(true);
    expect(SHOP_MODEL_REPO_PATH.endsWith(SHOP_MODEL_SERVING_URL)).toBe(true);
  });
});
