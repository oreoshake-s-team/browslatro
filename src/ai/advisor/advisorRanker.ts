import { createAdvisorRanker, type CandidateRanker } from "../policy";

export const ADVISOR_MODEL_URL = "/models/advisor-policy-v9.onnx";
export const ADVISOR_POLICY_MODEL_ID = "advisor-policy-v9";

let sharedRanker: CandidateRanker | null = null;

export function reportAdvisorFallback(error: unknown): void {
  console.warn(
    "[advisor] policy model unavailable — using greedy fallback suggestions",
    error,
  );
}

export function sharedAdvisorRanker(): CandidateRanker {
  sharedRanker =
    sharedRanker ??
    createAdvisorRanker(ADVISOR_MODEL_URL, reportAdvisorFallback);
  return sharedRanker;
}
