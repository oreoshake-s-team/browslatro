import { fetchModelBytes, type DownloadProgressListener } from "./download";
import {
  encodePackCandidatesV2,
  encodeShopCandidatesV2,
  SHOP_INPUT_FEATURES_V2,
} from "./shopEncoding";
import type { PackRankInput, ShopRankInput } from "./shopEncoding";

export const SHOP_MODEL_URL = "/models/advisor-shop-policy-v13.onnx";
export const SHOP_POLICY_MODEL_ID = "advisor-shop-policy-v13";

export interface ShopCandidateRanker {
  load(onProgress?: DownloadProgressListener): Promise<void>;
  rankShop(input: ShopRankInput): Promise<ReadonlyArray<number>>;
  rankPack(input: PackRankInput): Promise<ReadonlyArray<number>>;
}

async function loadRawShopRanker(
  modelUrl: string,
  onProgress?: DownloadProgressListener,
): Promise<ShopCandidateRanker> {
  const ort = await import("onnxruntime-web");
  const bytes = await fetchModelBytes(modelUrl, onProgress);
  const session = await ort.InferenceSession.create(bytes);

  async function rank(encoded: Float32Array, n: number): Promise<ReadonlyArray<number>> {
    if (n === 0) return [];
    const input = new ort.Tensor("float32", encoded, [n, SHOP_INPUT_FEATURES_V2]);
    const { logits } = await session.run({ candidates: input });
    const data = logits.data as Float32Array;
    return Array.from({ length: n }, (_, i) => i).sort((a, b) => data[b] - data[a]);
  }

  return {
    async load() {},
    async rankShop(i) { return rank(encodeShopCandidatesV2(i), i.candidates.length); },
    async rankPack(i) { return rank(encodePackCandidatesV2(i), i.candidates.length); },
  };
}

export function createShopRanker(modelUrl: string): ShopCandidateRanker {
  let loaded: Promise<ShopCandidateRanker> | null = null;
  let failed = false;
  const ensure = (
    onProgress?: DownloadProgressListener,
  ): Promise<ShopCandidateRanker> => {
    loaded = loaded ?? loadRawShopRanker(modelUrl, onProgress);
    return loaded;
  };
  const identity = (n: number): ReadonlyArray<number> => Array.from({ length: n }, (_, i) => i);

  async function safe<T>(fn: (r: ShopCandidateRanker) => Promise<T>, fallback: T): Promise<T> {
    if (failed) return fallback;
    try {
      return await fn(await ensure());
    } catch {
      failed = true;
      return fallback;
    }
  }

  return {
    async load(onProgress) {
      if (!failed) await ensure(onProgress).catch(() => { failed = true; });
    },
    async rankShop(i) { return safe((r) => r.rankShop(i), identity(i.candidates.length)); },
    async rankPack(i) { return safe((r) => r.rankPack(i), identity(i.candidates.length)); },
  };
}

let sharedRanker: ShopCandidateRanker | null = null;
export function sharedShopRanker(): ShopCandidateRanker {
  sharedRanker = sharedRanker ?? createShopRanker(SHOP_MODEL_URL);
  return sharedRanker;
}
