import { fetchModelBytes, type DownloadProgressListener } from "./download";
import { BLIND_INPUT_FEATURES, encodeBlindCandidates } from "./blindEncoding";
import type { BlindRankInput } from "./blindEncoding";

export const BLIND_MODEL_URL = "/models/advisor-blind-policy-v1.onnx";

export interface BlindCandidateRanker {
  load(onProgress?: DownloadProgressListener): Promise<void>;
  rankBlind(input: BlindRankInput): Promise<ReadonlyArray<number>>;
}

async function loadRawBlindRanker(
  modelUrl: string,
  onProgress?: DownloadProgressListener,
): Promise<BlindCandidateRanker> {
  const ort = await import("onnxruntime-web");
  const bytes = await fetchModelBytes(modelUrl, onProgress);
  const session = await ort.InferenceSession.create(bytes);

  async function rank(encoded: Float32Array, n: number): Promise<ReadonlyArray<number>> {
    if (n === 0) return [];
    const input = new ort.Tensor("float32", encoded, [n, BLIND_INPUT_FEATURES]);
    const { logits } = await session.run({ candidates: input });
    const data = logits.data as Float32Array;
    return Array.from({ length: n }, (_, i) => i).sort((a, b) => data[b] - data[a]);
  }

  return {
    async load() {},
    async rankBlind(i) {
      return rank(encodeBlindCandidates(i), i.candidates.length);
    },
  };
}

export function createBlindRanker(modelUrl: string): BlindCandidateRanker {
  let loaded: Promise<BlindCandidateRanker> | null = null;
  let failed = false;
  const ensure = (
    onProgress?: DownloadProgressListener,
  ): Promise<BlindCandidateRanker> => {
    loaded = loaded ?? loadRawBlindRanker(modelUrl, onProgress);
    return loaded;
  };
  const identity = (n: number): ReadonlyArray<number> =>
    Array.from({ length: n }, (_, i) => i);

  async function safe<T>(
    fn: (r: BlindCandidateRanker) => Promise<T>,
    fallback: T,
  ): Promise<T> {
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
      if (!failed) await ensure(onProgress).catch(() => {
        failed = true;
      });
    },
    async rankBlind(i) {
      return safe((r) => r.rankBlind(i), identity(i.candidates.length));
    },
  };
}

let sharedRanker: BlindCandidateRanker | null = null;
export function sharedBlindRanker(): BlindCandidateRanker {
  sharedRanker = sharedRanker ?? createBlindRanker(BLIND_MODEL_URL);
  return sharedRanker;
}
