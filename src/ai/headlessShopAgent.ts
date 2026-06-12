import { readFileSync } from "node:fs";
import { createJokerCatalog } from "../items/jokers/catalog";
import { MAX_JOKERS } from "../items/jokers/constants";
import type { Joker } from "../items/jokers/types";
import { jokerOfferPrice } from "../items/shop";
import { SHOP_INPUT_FEATURES, encodeShopCandidates } from "./advisor/shopEncoding";
import type { ShopAdviceCandidate } from "./advisor/types";
import type { HeadlessShopAgent, ShopResult, ShopView } from "./headlessRun";

const SHOP_OFFER_SLOTS = 2;

export async function createHeadlessShopAgent(
  modelPath: string,
): Promise<HeadlessShopAgent> {
  const bytes = readFileSync(modelPath);
  const ort = await import("onnxruntime-web");
  const session = await ort.InferenceSession.create(bytes);
  const catalog = createJokerCatalog().filter((j) => j.rarity !== "legendary");

  async function rankCandidates(
    candidates: ReadonlyArray<ShopAdviceCandidate>,
    money: number,
    ante: number,
    round: number,
  ): Promise<ReadonlyArray<number>> {
    const n = candidates.length;
    if (n === 0) return [];
    const encoded = encodeShopCandidates({ money, ante, round, candidates });
    const input = new ort.Tensor("float32", encoded, [n, SHOP_INPUT_FEATURES]);
    const { logits } = await session.run({ candidates: input });
    const data = logits.data as Float32Array;
    return Array.from({ length: n }, (_, i) => i).sort((a, b) => data[b] - data[a]);
  }

  return {
    async buyAfterAnte(view: ShopView): Promise<ShopResult> {
      const jokers = [...view.jokers];
      let money = view.money;
      const ownedIds = new Set(jokers.map((j) => j.id));

      const pool = catalog.filter((j) => !ownedIds.has(j.id));
      const offers: Joker[] = [];
      for (let i = 0; i < SHOP_OFFER_SLOTS && pool.length > 0; i += 1) {
        const idx = Math.floor(view.rng() * pool.length);
        offers.push(...pool.splice(idx, 1));
      }

      const round = view.ante * 3;
      while (jokers.length < MAX_JOKERS && offers.length > 0) {
        const candidates: ShopAdviceCandidate[] = [
          ...offers.map((j) => ({
            action: "buy" as const,
            item: {
              itemType: "joker" as const,
              id: j.id,
              name: j.name,
              description: "",
              cost: jokerOfferPrice(j),
            },
          })),
          { action: "leave" as const },
        ];

        const ranked = await rankCandidates(candidates, money, view.ante, round);
        const topIdx = ranked[0];
        if (topIdx === undefined) break;
        const choice = candidates[topIdx];
        if (choice.action !== "buy" || choice.item.cost > money) break;

        const bought = offers.find((j) => j.id === choice.item.id);
        if (bought === undefined) break;
        money -= choice.item.cost;
        jokers.push(bought);
        ownedIds.add(bought.id);
        offers.splice(offers.indexOf(bought), 1);
      }

      return { jokers, money };
    },
  };
}
