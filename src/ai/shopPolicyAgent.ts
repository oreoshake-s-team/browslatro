import { readFileSync } from "node:fs";
import type { ShopAdviceCandidate, ShopAdviceItem } from "./advisor/types";
import {
  encodeShopCandidates,
  SHOP_INPUT_FEATURES,
} from "./advisor/shopEncoding";
import type { ShopAction, ShopContext, HeadlessShopAgent } from "./headlessRun";
import { rerollCostFor } from "../items/shop";
import type { ShopItem } from "../items/shop";

function shopItemToAdviceItem(offer: ShopItem): ShopAdviceItem {
  switch (offer.kind) {
    case "joker":
      return {
        itemType: "joker",
        id: offer.joker.id,
        name: offer.joker.name,
        description: offer.joker.description,
        cost: offer.price,
      };
    case "planet":
      return {
        itemType: "planet",
        id: offer.planet.id,
        name: offer.planet.name,
        description: offer.planet.description,
        cost: offer.price,
      };
    case "tarot":
      return {
        itemType: "tarot",
        id: offer.tarot.id,
        name: offer.tarot.name,
        description: offer.tarot.description,
        cost: offer.price,
      };
    case "spectral":
      return {
        itemType: "spectral",
        id: offer.spectral.id,
        name: offer.spectral.name,
        description: offer.spectral.description,
        cost: offer.price,
      };
    case "playing-card":
      return {
        itemType: "playing-card",
        id: `${offer.card.rank}-${offer.card.suit}`,
        name: `${offer.card.rank} of ${offer.card.suit}`,
        description: "",
        cost: offer.price,
      };
    case "pack":
      return {
        itemType: "pack",
        id: `${offer.pack.pool}-${offer.pack.variant}`,
        name: `${offer.pack.pool} pack`,
        description: "",
        cost: offer.price,
      };
  }
}

export function buildCandidates(ctx: ShopContext): ReadonlyArray<ShopAdviceCandidate> {
  const candidates: ShopAdviceCandidate[] = [];
  for (const offer of ctx.offers) {
    if (!offer.sold && offer.price <= ctx.money) {
      candidates.push({ action: "buy", item: shopItemToAdviceItem(offer) });
    }
  }
  const rerollCost = rerollCostFor(ctx.rerollCount);
  if (rerollCost <= ctx.money) {
    candidates.push({ action: "reroll", cost: rerollCost });
  }
  candidates.push({ action: "leave" });
  return candidates;
}

function candidateToAction(
  candidate: ShopAdviceCandidate,
  ctx: ShopContext,
): ShopAction {
  if (candidate.action === "leave") return { kind: "leave" };
  if (candidate.action === "reroll") return { kind: "reroll" };
  const offer = ctx.offers.find(
    (o) =>
      !o.sold &&
      o.price <= ctx.money &&
      shopItemToAdviceItem(o).id === candidate.item.id,
  );
  if (offer === undefined) return { kind: "leave" };
  return { kind: "buy", offer };
}

async function loadNodeShopRanker(modelPath: string) {
  const ort = await import("onnxruntime-web");
  const bytes = readFileSync(modelPath);
  const session = await ort.InferenceSession.create(bytes);

  return async function rank(
    candidates: ReadonlyArray<ShopAdviceCandidate>,
    money: number,
    ante: number,
  ): Promise<ReadonlyArray<number>> {
    const n = candidates.length;
    if (n === 0) return [];
    const encoded = encodeShopCandidates({ money, ante, round: ante * 3, candidates });
    const tensor = new ort.Tensor("float32", encoded, [n, SHOP_INPUT_FEATURES]);
    const { logits } = await session.run({ candidates: tensor });
    const data = logits.data as Float32Array;
    return Array.from({ length: n }, (_, i) => i).sort((a, b) => data[b] - data[a]);
  };
}

export function createShopPolicyAgent(modelPath: string): HeadlessShopAgent {
  let rankerPromise: Promise<
    (candidates: ReadonlyArray<ShopAdviceCandidate>, money: number, ante: number) => Promise<ReadonlyArray<number>>
  > | null = null;

  const getOrLoadRanker = () => {
    rankerPromise = rankerPromise ?? loadNodeShopRanker(modelPath);
    return rankerPromise;
  };

  return {
    async chooseShopAction(ctx: ShopContext): Promise<ShopAction> {
      const candidates = buildCandidates(ctx);
      const leaveAction: ShopAction = { kind: "leave" };
      if (candidates.length <= 1) return leaveAction;

      try {
        const rank = await getOrLoadRanker();
        const ranking = await rank(candidates, ctx.money, ctx.ante);
        const best = candidates[ranking[0]];
        if (best === undefined) return leaveAction;
        return candidateToAction(best, ctx);
      } catch {
        return leaveAction;
      }
    },
  };
}
