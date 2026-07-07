import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./download", () => ({
  fetchModelBytes: vi.fn(async () => {
    throw new Error("model download failed");
  }),
}));

vi.mock("onnxruntime-web", () => ({
  InferenceSession: { create: vi.fn(async () => ({ run: vi.fn() })) },
  Tensor: class {},
}));

import { fetchModelBytes } from "./download";
import type { PackRankInput, ShopRankInput } from "./shopEncoding";
import { createShopRanker } from "./shopRanker";

const shopInput: ShopRankInput = {
  money: 10,
  ante: 1,
  round: 1,
  candidates: [{ action: "reroll", cost: 5 }, { action: "leave" }],
};

const packInput: PackRankInput = {
  money: 10,
  ante: 1,
  round: 1,
  picksRemaining: 1,
  candidates: [{ action: "skip" }],
};

beforeEach(() => {
  vi.mocked(fetchModelBytes).mockClear();
});

describe("createShopRanker — model failures fail fast", () => {
  test("load rejects when the model cannot load", async () => {
    await expect(createShopRanker("/models/x.onnx").load()).rejects.toThrow();
  });

  test("rankShop rejects when the model cannot load", async () => {
    await expect(
      createShopRanker("/models/x.onnx").rankShop(shopInput),
    ).rejects.toThrow();
  });

  test("rankPack rejects when the model cannot load", async () => {
    await expect(
      createShopRanker("/models/x.onnx").rankPack(packInput),
    ).rejects.toThrow();
  });

  test("does not serve an identity ranking when the model is unavailable", async () => {
    const outcome = await createShopRanker("/models/x.onnx")
      .rankShop(shopInput)
      .then((ranking) => ({ rejected: false, ranking }))
      .catch(() => ({ rejected: true, ranking: null }));
    expect(outcome).toEqual({ rejected: true, ranking: null });
  });

  test("a failure does not latch: the next call retries the download", async () => {
    const ranker = createShopRanker("/models/x.onnx");
    await ranker.rankShop(shopInput).catch(() => undefined);
    await ranker.rankShop(shopInput).catch(() => undefined);
    expect(fetchModelBytes).toHaveBeenCalledTimes(2);
  });
});
