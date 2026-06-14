import type { RandomSource } from "../items/jokers/types";
import type { TagId } from "../items/tags";
import { getHandOptions } from "./getHandOptions";
import type {
  AgentAction,
  HeadlessAgent,
  HeadlessRoundView,
} from "./headlessRun";

const RANDOM_DISCARD_CHANCE = 0.25;

const SKIP_WORTHY_TAGS: ReadonlySet<TagId> = new Set<TagId>([
  "speed",
  "economy",
  "investment",
]);

export function defaultShouldSkipTag(tag: TagId): boolean {
  return SKIP_WORTHY_TAGS.has(tag);
}

export function createSkipAgent(
  base: HeadlessAgent,
  shouldSkip: (tag: TagId) => boolean = defaultShouldSkipTag,
): HeadlessAgent {
  return {
    name: `skip(${base.name})`,
    chooseAction(view: HeadlessRoundView): AgentAction | Promise<AgentAction> {
      if (view.offeredTag !== null && shouldSkip(view.offeredTag)) {
        return { kind: "skip" };
      }
      return base.chooseAction(view);
    },
  };
}

function randomSubset(
  ids: ReadonlyArray<number>,
  rng: RandomSource,
): number[] {
  const size = 1 + Math.floor(rng() * Math.min(5, ids.length));
  const pool = [...ids];
  const picked: number[] = [];
  for (let i = 0; i < size; i += 1) {
    const index = Math.floor(rng() * pool.length);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
}

export function createRandomAgent(rng: RandomSource): HeadlessAgent {
  return {
    name: "random",
    chooseAction(view: HeadlessRoundView): AgentAction {
      const ids = view.dealt.hand.map((c) => c.id);
      if (view.remainingDiscards > 0 && rng() < RANDOM_DISCARD_CHANCE) {
        return { kind: "discard", cardIds: randomSubset(ids, rng) };
      }
      return { kind: "play", cardIds: randomSubset(ids, rng) };
    },
  };
}

export function createGreedyAgent(): HeadlessAgent {
  return {
    name: "greedy",
    chooseAction(view: HeadlessRoundView): AgentAction {
      const options = getHandOptions(view, 1);
      const bestPlay = options.find((o) => o.action === "play");
      if (bestPlay !== undefined) {
        return { kind: "play", cardIds: bestPlay.cardIds };
      }
      if (view.remainingDiscards > 0) {
        const discard = options.find((o) => o.action === "discard");
        return {
          kind: "discard",
          cardIds: discard?.cardIds ?? [view.dealt.hand[0].id],
        };
      }
      return { kind: "play", cardIds: [view.dealt.hand[0].id] };
    },
  };
}
