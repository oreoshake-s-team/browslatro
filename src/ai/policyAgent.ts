import { getHandOptions } from "./getHandOptions";
import type {
  AgentAction,
  HeadlessAgent,
  HeadlessRoundView,
} from "./headlessRun";
import { toModelState } from "./modelState";
import type { CandidateRanker } from "./policy";

export function createPolicyAgent(
  ranker: CandidateRanker,
  topN: number = 3,
): HeadlessAgent {
  return {
    name: "policy",
    async chooseAction(view: HeadlessRoundView): Promise<AgentAction> {
      const candidates = getHandOptions(view, topN);
      if (candidates.length > 0) {
        const ranking = await ranker.rank(toModelState(view), candidates);
        const best = candidates[ranking[0]];
        return best.action === "play"
          ? { kind: "play", cardIds: best.cardIds }
          : { kind: "discard", cardIds: best.cardIds };
      }
      if (view.remainingDiscards > 0) {
        return { kind: "discard", cardIds: [view.dealt.hand[0].id] };
      }
      return { kind: "play", cardIds: [view.dealt.hand[0].id] };
    },
  };
}
