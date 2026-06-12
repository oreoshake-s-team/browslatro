import { createAdvisorRanker, type CandidateRanker } from "../policy";

export const ADVISOR_MODEL_URL = "/models/advisor-policy-v4.onnx";

let sharedRanker: CandidateRanker | null = null;

export function sharedAdvisorRanker(): CandidateRanker {
  sharedRanker = sharedRanker ?? createAdvisorRanker(ADVISOR_MODEL_URL);
  return sharedRanker;
}
