import { createJokerCatalog } from "../items/jokers/catalog";
import { pickShopOffers } from "../items/shop";
import type { ShopItem } from "../items/shop";
import { createSpectralCatalog } from "../items/spectrals";
import { createPlanetCatalog } from "../items/planets";
import { createTarotCatalog } from "../items/tarots";
import { extraShopOfferSlots } from "../items/vouchers";
import { jokerEffectCategory } from "./encode";
import type { HeadlessShopAgent, ShopResult, ShopView } from "./headlessRun";
import {
  applyOfferToState,
  type ConsumableLabelDeps,
  type PostShopState,
} from "./shopRolloutExpert";

export function offerBuildValue(offer: ShopItem): number {
  if (offer.kind === "joker") {
    const category = jokerEffectCategory(offer.joker.effect.kind);
    if (category === "x-mult") return 95;
    if (category === "mult" || category === "retrigger") return 75;
    return 55;
  }
  if (offer.kind === "planet") return 85;
  if (offer.kind === "tarot" || offer.kind === "spectral") return 65;
  return 0;
}

export function createJokerStackingShopAgent(): HeadlessShopAgent {
  const jokerCatalog = createJokerCatalog().filter((j) => j.rarity !== "legendary");
  const planetCatalog = createPlanetCatalog();
  const tarotCatalog = createTarotCatalog();
  const spectralCatalog = createSpectralCatalog();
  const deps: ConsumableLabelDeps = { jokerCatalog, planetCatalog, tarotCatalog };

  return {
    async buyAfterRound(view: ShopView): Promise<ShopResult> {
      const ownedIds = new Set(view.jokers.map((j) => j.id));
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
      ].sort((a, b) => offerBuildValue(b) - offerBuildValue(a));

      let state: PostShopState = {
        jokers: [...view.jokers],
        money: view.money,
        handStats: view.handStats,
        deck: view.deck,
      };

      for (const offer of offers) {
        if (offerBuildValue(offer) === 0) continue;
        const post = applyOfferToState(offer, state, deps, view.rng);
        if (post !== null) state = post;
      }

      return {
        jokers: state.jokers,
        money: state.money,
        handStats: state.handStats,
        deck: state.deck,
        ownedVoucherIds: view.ownedVoucherIds,
      };
    },
  };
}
