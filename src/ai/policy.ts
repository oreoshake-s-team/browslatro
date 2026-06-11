import {
  fetchModelBytes,
  type DownloadProgressListener,
} from "./advisor/download";
import { encodeDecision, INPUT_FEATURES } from "./encode";
import type { HandOption } from "./getHandOptions";
import type { ModelState } from "./modelState";

export type { DownloadProgress, DownloadProgressListener } from "./advisor/download";

export interface CandidateRanker {
  load(onProgress?: DownloadProgressListener): Promise<void>;
  rank(
    state: ModelState,
    candidates: ReadonlyArray<HandOption>,
  ): Promise<ReadonlyArray<number>>;
}

export function greedyRanking(
  candidates: ReadonlyArray<HandOption>,
): number[] {
  const indices = candidates.map((_, index) => index);
  return indices.sort((a, b) => {
    const left = candidates[a];
    const right = candidates[b];
    if (left.action !== right.action) {
      return left.action === "play" ? -1 : 1;
    }
    if (left.action === "play" && right.action === "play") {
      return right.score - left.score;
    }
    return a - b;
  });
}

export async function loadPolicyRanker(
  model: string | Uint8Array,
  onProgress?: DownloadProgressListener,
): Promise<CandidateRanker> {
  const ort = await import("onnxruntime-web");
  const bytes =
    typeof model === "string" ? await fetchModelBytes(model, onProgress) : model;
  const session = await ort.InferenceSession.create(bytes);
  return {
    async load() {},
    async rank(state, candidates) {
      if (candidates.length === 0) return [];
      const input = new ort.Tensor(
        "float32",
        encodeDecision(state, candidates),
        [candidates.length, INPUT_FEATURES],
      );
      const output = await session.run({ candidates: input });
      const logits = output.logits.data as Float32Array;
      return candidates
        .map((_, index) => index)
        .sort((a, b) => logits[b] - logits[a]);
    },
  };
}

export function createAdvisorRanker(
  model: string | Uint8Array,
  onFallback?: (error: unknown) => void,
): CandidateRanker {
  let policy: Promise<CandidateRanker> | null = null;
  let degraded = false;
  const ensure = (
    onProgress?: DownloadProgressListener,
  ): Promise<CandidateRanker> => {
    policy = policy ?? loadPolicyRanker(model, onProgress);
    return policy;
  };
  return {
    async load(onProgress) {
      if (degraded) return;
      try {
        await ensure(onProgress);
      } catch (error) {
        degraded = true;
        onFallback?.(error);
      }
    },
    async rank(state, candidates) {
      if (!degraded) {
        try {
          return await (await ensure()).rank(state, candidates);
        } catch (error) {
          degraded = true;
          onFallback?.(error);
        }
      }
      return greedyRanking(candidates);
    },
  };
}
