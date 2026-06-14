import { describe, expect, test, vi } from "vitest";

vi.mock("./download", () => ({
  fetchModelBytes: vi.fn(async () => new Uint8Array()),
}));

vi.mock("onnxruntime-web", () => ({
  InferenceSession: { create: vi.fn(async () => ({ run: vi.fn() })) },
  Tensor: class {},
}));

import { fetchModelBytes } from "./download";
import { createShopRanker } from "./shopRanker";

describe("createShopRanker — download progress", () => {
  test("load threads the progress callback through to fetchModelBytes", async () => {
    const ranker = createShopRanker("/models/test.onnx");
    const onProgress = vi.fn();
    await ranker.load(onProgress);
    expect(fetchModelBytes).toHaveBeenCalledWith("/models/test.onnx", onProgress);
  });

  test("load without a callback still downloads the model (negative)", async () => {
    const ranker = createShopRanker("/models/test.onnx");
    await ranker.load();
    expect(fetchModelBytes).toHaveBeenCalledWith(
      "/models/test.onnx",
      undefined,
    );
  });
});
