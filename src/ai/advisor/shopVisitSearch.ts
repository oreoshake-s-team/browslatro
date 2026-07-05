import type { ShopAdviceCandidate } from "./types";
import { applyShopAction, type ShopSearchState } from "./shopTransition";
import { encodeShopSearchContext, SHOP_CONTEXT_FEATURES } from "./shopEncoding";

export type StateEvaluator = (
  contexts: Float32Array,
  rows: number,
) => Promise<Float32Array>;

export interface ShopVisitSearchInput {
  readonly candidates: ReadonlyArray<ShopAdviceCandidate>;
  readonly state: ShopSearchState;
  readonly ante: number;
  readonly round: number;
  readonly beamWidth?: number;
  readonly maxDepth?: number;
}

export interface ShopVisitPlan {
  readonly firstIndex: number | null;
  readonly sequence: ReadonlyArray<number>;
  readonly score: number;
  readonly baselineScore: number;
}

interface SearchNode {
  readonly state: ShopSearchState;
  readonly used: ReadonlyArray<number>;
  readonly terminal: boolean;
}

function frontierTransition(
  state: ShopSearchState,
  candidate: ShopAdviceCandidate,
): ShopSearchState | null {
  if (candidate.action === "reroll") {
    if (candidate.cost > state.money) return null;
    return { build: state.build, money: state.money - candidate.cost };
  }
  if (candidate.action === "buy" && (candidate.item.itemType === "pack" || candidate.item.itemType === "playing-card" || candidate.item.itemType === "voucher")) {
    if (candidate.item.cost > state.money) return null;
    return { build: state.build, money: state.money - candidate.item.cost };
  }
  return null;
}

export async function searchShopVisit(
  input: ShopVisitSearchInput,
  evaluate: StateEvaluator,
): Promise<ShopVisitPlan> {
  const beamWidth = input.beamWidth ?? 8;
  const maxDepth = input.maxDepth ?? 6;

  const score = async (nodes: ReadonlyArray<SearchNode>): Promise<number[]> => {
    const contexts = new Float32Array(nodes.length * SHOP_CONTEXT_FEATURES);
    nodes.forEach((node, row) => {
      contexts.set(
        encodeShopSearchContext(node.state.build, node.state.money, input.ante, input.round),
        row * SHOP_CONTEXT_FEATURES,
      );
    });
    const values = await evaluate(contexts, nodes.length);
    return Array.from(values.slice(0, nodes.length));
  };

  const root: SearchNode = { state: input.state, used: [], terminal: false };
  const [baselineScore] = await score([root]);
  let best: ShopVisitPlan = {
    firstIndex: null,
    sequence: [],
    score: baselineScore,
    baselineScore,
  };

  let beam: ReadonlyArray<SearchNode> = [root];
  for (let depth = 0; depth < maxDepth && beam.length > 0; depth += 1) {
    const expanded: SearchNode[] = [];
    for (const node of beam) {
      if (node.terminal) continue;
      input.candidates.forEach((candidate, index) => {
        if (node.used.includes(index)) return;
        const deterministic = applyShopAction(node.state, candidate);
        if (deterministic !== null && candidate.action !== "leave") {
          expanded.push({ state: deterministic, used: [...node.used, index], terminal: false });
          return;
        }
        const frontier = frontierTransition(node.state, candidate);
        if (frontier !== null) {
          expanded.push({ state: frontier, used: [...node.used, index], terminal: true });
        }
      });
    }
    if (expanded.length === 0) break;

    const scores = await score(expanded);
    const ranked = expanded
      .map((node, i) => ({ node, score: scores[i] }))
      .sort((a, b) => b.score - a.score);

    for (const { node, score: nodeScore } of ranked) {
      if (nodeScore > best.score) {
        best = {
          firstIndex: node.used[0],
          sequence: node.used,
          score: nodeScore,
          baselineScore,
        };
      }
    }
    beam = ranked.slice(0, beamWidth).map((entry) => entry.node);
  }

  return best;
}
