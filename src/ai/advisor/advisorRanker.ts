import { createAdvisorRanker, type CandidateRanker } from "../policy";
import { HAND_MODEL_ID, HAND_MODEL_URL } from "./productionModels";

export const ADVISOR_MODEL_URL = HAND_MODEL_URL;
export const ADVISOR_POLICY_MODEL_ID = HAND_MODEL_ID;

let sharedRanker: CandidateRanker | null = null;

export function sharedAdvisorRanker(): CandidateRanker {
  sharedRanker = sharedRanker ?? createAdvisorRanker(ADVISOR_MODEL_URL);
  return sharedRanker;
}
