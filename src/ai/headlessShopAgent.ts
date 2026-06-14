import { readFileSync } from "node:fs";
import { applyPlanetUpgrade, createPlanetCatalog } from "../items/planets";
import { createJokerCatalog } from "../items/jokers/catalog";
import { MAX_JOKERS } from "../items/jokers/constants";
import { packPickLimit, type PackOption } from "../items/packs";
import { pickShopOffers, rerollCostFor, type ShopItem } from "../items/shop";
import { createSpectralCatalog } from "../items/spectrals";
import { createTarotCatalog } from "../items/tarots";
import {
  extraShopOfferSlots,
  pickVoucherForAnte,
  type Voucher,
  type VoucherId,
} from "../items/vouchers";
import type { HandStats } from "../scoring/handStats";
import {
  SHOP_INPUT_FEATURES,
  encodePackCandidates,
  encodeShopCandidates,
} from "./advisor/shopEncoding";
import type { PackAdviceCandidate, ShopAdviceCandidate } from "./advisor/types";
import type { HeadlessShopAgent, ShopResult, ShopView } from "./headlessRun";
import {
  applySpectralEffectToDeck,
  applyTarotEffectToDeck,
} from "./headlessConsumables";

const MAX_REROLLS = 2;

function packOptionToCandidate(opt: PackOption): PackAdviceCandidate {
  if (opt.kind === "joker") return { action: "pick", option: { optionType: "joker", id: opt.joker.id, name: opt.joker.name, description: "" } };
  if (opt.kind === "planet") return { action: "pick", option: { optionType: "planet", id: opt.planet.id, name: opt.planet.name, description: "" } };
  if (opt.kind === "tarot") return { action: "pick", option: { optionType: "tarot", id: opt.tarot.id, name: opt.tarot.name, description: "" } };
  if (opt.kind === "spectral") return { action: "pick", option: { optionType: "spectral", id: opt.spectral.id, name: opt.spectral.name, description: "" } };
  return { action: "pick", option: { optionType: "playing-card", id: "card", name: "Card", description: "" } };
}

function shopItemCandidate(item: ShopItem): ShopAdviceCandidate {
  if (item.kind === "joker") return { action: "buy", item: { itemType: "joker", id: item.joker.id, name: item.joker.name, description: "", cost: item.price } };
  if (item.kind === "planet") return { action: "buy", item: { itemType: "planet", id: item.planet.id, name: item.planet.name, description: "", cost: item.price } };
  if (item.kind === "tarot") return { action: "buy", item: { itemType: "tarot", id: item.tarot.id, name: item.tarot.name, description: "", cost: item.price } };
  if (item.kind === "spectral") return { action: "buy", item: { itemType: "spectral", id: item.spectral.id, name: item.spectral.name, description: "", cost: item.price } };
  if (item.kind === "pack") return { action: "buy", item: { itemType: "pack", id: item.pack.pool, name: item.pack.pool, description: "", cost: item.price } };
  return { action: "buy", item: { itemType: "playing-card", id: "card", name: "Card", description: "", cost: item.price } };
}

export function voucherCandidate(voucher: Voucher): ShopAdviceCandidate {
  return {
    action: "buy",
    item: { itemType: "voucher", id: voucher.id, name: voucher.name, description: "", cost: voucher.cost },
  };
}

export async function createHeadlessShopAgent(modelPath: string): Promise<HeadlessShopAgent> {
  const bytes = readFileSync(modelPath);
  const ort = await import("onnxruntime-web");
  const session = await ort.InferenceSession.create(bytes);
  const jokerCatalog = createJokerCatalog().filter((j) => j.rarity !== "legendary");
  const planetCatalog = createPlanetCatalog();
  const tarotCatalog = createTarotCatalog();
  const spectralCatalog = createSpectralCatalog();

  async function runSession(encoded: Float32Array, n: number): Promise<Float32Array> {
    const input = new ort.Tensor("float32", encoded, [n, SHOP_INPUT_FEATURES]);
    const { logits } = await session.run({ candidates: input });
    return logits.data as Float32Array;
  }

  async function topRanked(encoded: Float32Array, n: number): Promise<number> {
    const data = await runSession(encoded, n);
    return Array.from({ length: n }, (_, i) => i).sort((a, b) => data[b] - data[a])[0] ?? 0;
  }

  function rollOffers(
    ownedIds: ReadonlySet<string>,
    rng: () => number,
    extraSlots: number,
  ): ShopItem[] {
    return [...pickShopOffers({ jokerCatalog, excludedJokerIds: [...ownedIds], planetCatalog, tarotCatalog, spectralCatalog, extraSlots, rng })];
  }

  return {
    async buyAfterRound(view: ShopView): Promise<ShopResult> {
      const jokers = [...view.jokers];
      let handStats: HandStats = view.handStats;
      let money = view.money;
      let deck = view.deck;
      let ownedVoucherIds: ReadonlySet<VoucherId> = view.ownedVoucherIds;
      const ownedIds = new Set(jokers.map((j) => j.id));
      let offers = rollOffers(ownedIds, view.rng, extraShopOfferSlots(ownedVoucherIds));
      let voucher = pickVoucherForAnte({ ante: view.ante, ownedIds: ownedVoucherIds, rng: view.rng });
      let rerollsDone = 0;

      for (;;) {
        const rerollCost = rerollCostFor(rerollsDone);
        const candidates: ShopAdviceCandidate[] = [
          ...offers.map(shopItemCandidate),
          ...(voucher !== null && voucher.cost <= money ? [voucherCandidate(voucher)] : []),
          ...(rerollsDone < MAX_REROLLS && rerollCost <= money ? [{ action: "reroll" as const, cost: rerollCost }] : []),
          { action: "leave" as const },
        ];
        const topIdx = await topRanked(encodeShopCandidates({ money, ante: view.ante, round: view.round, candidates }), candidates.length);
        const choice = candidates[topIdx];
        if (choice === undefined || choice.action === "leave") break;

        if (choice.action === "reroll") {
          money -= rerollCost;
          rerollsDone += 1;
          offers = rollOffers(ownedIds, view.rng, extraShopOfferSlots(ownedVoucherIds));
          continue;
        }

        if (choice.action === "buy" && choice.item.itemType === "voucher" && voucher !== null) {
          money -= voucher.cost;
          ownedVoucherIds = new Set(ownedVoucherIds).add(voucher.id);
          voucher = null;
          continue;
        }

        const offer = offers[topIdx];
        if (offer === undefined || offer.price > money) break;
        money -= offer.price;
        offers = offers.filter((_, i) => i !== topIdx);

        if (offer.kind === "joker" && jokers.length < MAX_JOKERS) {
          jokers.push(offer.joker);
          ownedIds.add(offer.joker.id);
        } else if (offer.kind === "planet") {
          handStats = applyPlanetUpgrade(handStats, offer.planet);
        } else if (offer.kind === "tarot") {
          ({ deck, money } = applyTarotEffectToDeck({ deck, money, jokers }, offer.tarot.effect, view.rng));
        } else if (offer.kind === "spectral") {
          ({ deck, money } = applySpectralEffectToDeck({ deck, money, jokers }, offer.spectral.effect, view.rng));
        } else if (offer.kind === "pack") {
          let packOptions = [...offer.pack.options];
          let picksLeft = packPickLimit(offer.pack.variant);
          while (picksLeft > 0 && packOptions.length > 0) {
            const packCandidates: PackAdviceCandidate[] = [...packOptions.map(packOptionToCandidate), { action: "skip" }];
            const pickIdx = await topRanked(encodePackCandidates({ money, ante: view.ante, round: view.round, picksRemaining: picksLeft, candidates: packCandidates }), packCandidates.length);
            const picked = packOptions[pickIdx];
            if (picked === undefined) break;
            packOptions = packOptions.filter((_, i) => i !== pickIdx);
            picksLeft -= 1;
            if (picked.kind === "joker" && jokers.length < MAX_JOKERS) { jokers.push(picked.joker); ownedIds.add(picked.joker.id); }
            else if (picked.kind === "planet") { handStats = applyPlanetUpgrade(handStats, picked.planet); }
            else if (picked.kind === "tarot") { ({ deck, money } = applyTarotEffectToDeck({ deck, money, jokers }, picked.tarot.effect, view.rng)); }
            else if (picked.kind === "spectral") { ({ deck, money } = applySpectralEffectToDeck({ deck, money, jokers }, picked.spectral.effect, view.rng)); }
          }
        }
      }

      return { jokers, money, handStats, ownedVoucherIds, deck };
    },
  };
}
