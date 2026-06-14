import type { ShopAdviceCandidate } from "../src/ai/advisor/types";
import type { ShopView } from "../src/ai/headlessRun";
import type { ShopTeacherLabeler } from "./shopTeacher";

export function argmax(scores: ReadonlyArray<number>): number {
  let best = -1;
  let bestScore = -Infinity;
  scores.forEach((score, index) => {
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

export function isContested(
  scores: ReadonlyArray<number>,
  margin: number,
): boolean {
  if (scores.length < 2) return false;
  const sorted = [...scores].sort((a, b) => b - a);
  const top = sorted[0];
  const second = sorted[1];
  const denom = Math.abs(top) > 0 ? Math.abs(top) : 1;
  return top - second <= margin * denom;
}

export interface ShopGateResult {
  readonly index: number;
  readonly source: "rollout" | "teacher";
}

export async function labelShopWithGate(args: {
  readonly scores: ReadonlyArray<number>;
  readonly view: ShopView;
  readonly candidates: ReadonlyArray<ShopAdviceCandidate>;
  readonly teacher: ShopTeacherLabeler;
  readonly margin: number;
}): Promise<ShopGateResult> {
  const rolloutIndex = argmax(args.scores);
  if (!isContested(args.scores, args.margin)) {
    return { index: rolloutIndex, source: "rollout" };
  }
  const teacherIndex = await args.teacher(args.view, args.candidates);
  if (teacherIndex === null) {
    return { index: rolloutIndex, source: "rollout" };
  }
  return { index: teacherIndex, source: "teacher" };
}
