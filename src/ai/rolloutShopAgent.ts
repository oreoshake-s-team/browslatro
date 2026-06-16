import { createJokerCatalog } from "../items/jokers/catalog";
import { MAX_JOKERS } from "../items/jokers/constants";
import { pickShopOffers } from "../items/shop";
import { createSpectralCatalog } from "../items/spectrals";
import { createPlanetCatalog } from "../items/planets";
import { createTarotCatalog } from "../items/tarots";
import { extraShopOfferSlots } from "../items/vouchers";
import type { HeadlessShopAgent, ShopResult, ShopView } from "./headlessRun";

export function createJokerStackingShopAgent(): HeadlessShopAgent {
  const jokerCatalog = createJokerCatalog().filter((j) => j.rarity !== "legendary");
  const planetCatalog = createPlanetCatalog();
  const tarotCatalog = createTarotCatalog();
  const spectralCatalog = createSpectralCatalog();

  return {
    async buyAfterRound(view: ShopView): Promise<ShopResult> {
      const jokers = [...view.jokers];
      let money = view.money;
      const ownedIds = new Set(jokers.map((j) => j.id));
      const offers = [
        ...pickShopOffers({
          jokerCatalog,
          excludedJokerIds: [...ownedIds],
          planetCatalog,
          tarotCatalog,
          spectralCatalog,
          extraSlots: extraShopOfferSlots(view.ownedVoucherIds),
          rng: view.rng,
        }),
      ]
        .filter((offer) => offer.kind === "joker")
        .sort((a, b) => a.price - b.price);

      for (const offer of offers) {
        if (offer.kind !== "joker") continue;
        if (jokers.length >= MAX_JOKERS || offer.price > money) continue;
        money -= offer.price;
        jokers.push(offer.joker);
        ownedIds.add(offer.joker.id);
      }

      return {
        jokers,
        money,
        handStats: view.handStats,
        deck: view.deck,
        ownedVoucherIds: view.ownedVoucherIds,
      };
    },
  };
}
