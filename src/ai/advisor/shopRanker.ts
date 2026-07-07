import { fetchModelBytes, type DownloadProgressListener } from "./download";
import {
  encodePackCandidatesV2,
  encodeShopCandidatesV2,
  SHOP_INPUT_FEATURES_V2,
} from "./shopEncoding";
import type { PackRankInput, ShopRankInput } from "./shopEncoding";
import { SHOP_MODEL_ID, SHOP_MODEL_SERVING_URL } from "./productionModels";

export const SHOP_MODEL_URL = SHOP_MODEL_SERVING_URL;
export const SHOP_POLICY_MODEL_ID = SHOP_MODEL_ID;

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
  const ensure = async (
    onProgress?: DownloadProgressListener,
  ): Promise<ShopCandidateRanker> => {
    loaded = loaded ?? loadRawShopRanker(modelUrl, onProgress);
    try {
      return await loaded;
    } catch (error) {
      loaded = null;
      throw error;
    }
  };

  return {
    async load(onProgress) {
      await ensure(onProgress);
    },
    async rankShop(i) { return (await ensure()).rankShop(i); },
    async rankPack(i) { return (await ensure()).rankPack(i); },
  };
}

let sharedRanker: ShopCandidateRanker | null = null;
export function sharedShopRanker(): ShopCandidateRanker {
  sharedRanker = sharedRanker ?? createShopRanker(SHOP_MODEL_URL);
  return sharedRanker;
}
