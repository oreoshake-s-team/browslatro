import { readFileSync } from "node:fs";
import { MAX_CONSUMABLE_SLOTS, type Consumable } from "../items/consumables";
import { createPlanetCatalog } from "../items/planets";
import { createJokerCatalog } from "../items/jokers/catalog";
import { MAX_JOKERS } from "../items/jokers/constants";
import { canSellJoker } from "../items/jokers/stickers";
import { jokerSellValue } from "../items/jokers/scoring/utils";
import type { Joker } from "../items/jokers/types";
import { packPickLimit, type PackOption } from "../items/packs";
import { consumablePurchaseAllowed, isConsumableShopKind, pickShopOffers, rerollAllowed, rerollCostFor, type ShopItem } from "../items/shop";
import { createSpectralCatalog } from "../items/spectrals";
import { createTarotCatalog } from "../items/tarots";
import {
  applyShopDiscount,
  extraJokerSlots,
  extraShopOfferSlots,
  pickVoucherForAnte,
  rerollCostReduction,
  type Voucher,
  type VoucherId,
} from "../items/vouchers";
import type { HandStats } from "../scoring/handStats";
import {
  SHOP_INPUT_FEATURES,
  SHOP_INPUT_FEATURES_V2,
  encodePackCandidates,
  encodePackCandidatesV2,
  encodeShopCandidates,
  encodeShopCandidatesV2,
  shopBuildSummary,
  type ShopBuild,
} from "./advisor/shopEncoding";
import type { PackAdviceCandidate, ShopAdviceCandidate } from "./advisor/types";
import type { HeadlessShopAgent, ShopResult, ShopView } from "./headlessRun";
import { categorizePackOption, categorizeShopItem } from "./advisor/shopCategory";
import {
  packOptionAttributes,
  shopItemAttributes,
  ZERO_SHOP_ATTRIBUTES,
} from "./advisor/shopCandidateAttributes";
import { applyConsumable } from "./headlessConsumables";
import { emptyShopActivity, type ShopActivity } from "./shopActivity";

const MAX_REROLLS = 2;

type ShopOfferSnapshot = Extract<ShopAdviceCandidate, { action: "buy" }>["item"];

export interface ShopCandidateSnapshot {
  readonly itemType: string;
  readonly category: string;
  readonly attributes?: ReadonlyArray<number>;
  readonly cost: number;
  readonly isReroll: boolean;
  readonly isLeave: boolean;
  readonly isUse: boolean;
}

export interface ShopDecisionLog {
  readonly kind: "purchase" | "reroll" | "use";
  readonly money: number;
  readonly ante: number;
  readonly round: number;
  readonly offers: ReadonlyArray<ShopOfferSnapshot>;
  readonly item?: ShopOfferSnapshot | null;
  readonly cost?: number;
  readonly candidates?: ReadonlyArray<ShopCandidateSnapshot>;
  readonly chosenIndex?: number;
  readonly handLevels: Readonly<Record<string, number>>;
  readonly jokers: ReadonlyArray<{ readonly effectKind: string; readonly rarity: string }>;
  readonly deckEnhancements: Readonly<Record<string, number>>;
  readonly consumablesHeld: number;
}

export interface HeadlessShopAgentOptions {
  readonly chooseIndex?: (logits: Float32Array, n: number) => number;
  readonly onShopDecision?: (log: ShopDecisionLog) => void;
  readonly buildOverride?: (build: ShopBuild) => ShopBuild;
  readonly holdConsumables?: boolean;
  readonly scoreCandidates?: (
    encoded: Float32Array,
    n: number,
    featureCount: number,
  ) => Float32Array | Promise<Float32Array>;
}

function packOptionToCandidate(opt: PackOption): PackAdviceCandidate {
  const category = categorizePackOption(opt);
  const attributes = packOptionAttributes(opt);
  if (opt.kind === "joker") return { action: "pick", option: { optionType: "joker", category, attributes, id: opt.joker.id, name: opt.joker.name, description: "" } };
  if (opt.kind === "planet") return { action: "pick", option: { optionType: "planet", category, attributes, id: opt.planet.id, name: opt.planet.name, description: "" } };
  if (opt.kind === "tarot") return { action: "pick", option: { optionType: "tarot", category, attributes, id: opt.tarot.id, name: opt.tarot.name, description: "" } };
  if (opt.kind === "spectral") return { action: "pick", option: { optionType: "spectral", category, attributes, id: opt.spectral.id, name: opt.spectral.name, description: "" } };
  return { action: "pick", option: { optionType: "playing-card", category, attributes, id: "card", name: "Card", description: "" } };
}

function shopItemCandidate(item: ShopItem): Extract<ShopAdviceCandidate, { action: "buy" }> {
  const category = categorizeShopItem(item);
  const attributes = shopItemAttributes(item);
  if (item.kind === "joker") return { action: "buy", item: { itemType: "joker", category, attributes, id: item.joker.id, name: item.joker.name, description: "", cost: item.price } };
  if (item.kind === "planet") return { action: "buy", item: { itemType: "planet", category, attributes, id: item.planet.id, name: item.planet.name, description: "", cost: item.price } };
  if (item.kind === "tarot") return { action: "buy", item: { itemType: "tarot", category, attributes, id: item.tarot.id, name: item.tarot.name, description: "", cost: item.price } };
  if (item.kind === "spectral") return { action: "buy", item: { itemType: "spectral", category, attributes, id: item.spectral.id, name: item.spectral.name, description: "", cost: item.price } };
  if (item.kind === "pack") return { action: "buy", item: { itemType: "pack", category, attributes, id: item.pack.pool, name: item.pack.pool, description: "", cost: item.price } };
  return { action: "buy", item: { itemType: "playing-card", category, attributes, id: "card", name: "Card", description: "", cost: item.price } };
}

export function voucherCandidate(voucher: Voucher): ShopAdviceCandidate {
  return {
    action: "buy",
    item: { itemType: "voucher", category: "other", attributes: ZERO_SHOP_ATTRIBUTES, id: voucher.id, name: voucher.name, description: "", cost: voucher.cost },
  };
}

function jokerSellCandidate(joker: Joker, index: number): ShopAdviceCandidate {
  const item = { kind: "joker", joker, price: 0, sold: false } as const;
  return {
    action: "sell",
    item: { itemType: "joker", category: categorizeShopItem(item), attributes: shopItemAttributes(item), id: `sell:${joker.id}:${index}`, name: joker.name, description: "", cost: -jokerSellValue(joker) },
  };
}

function consumableToPackOption(consumable: Consumable): PackOption {
  if (consumable.kind === "planet") return { kind: "planet", planet: consumable.card };
  if (consumable.kind === "tarot") return { kind: "tarot", tarot: consumable.card };
  return { kind: "spectral", spectral: consumable.card };
}

export function consumableUseCandidate(consumable: Consumable, index: number): ShopAdviceCandidate {
  const option = consumableToPackOption(consumable);
  return {
    action: "use",
    item: {
      itemType: consumable.kind,
      category: categorizePackOption(option),
      attributes: packOptionAttributes(option),
      id: `use:${consumable.card.id}:${index}`,
      name: consumable.card.name,
      description: "",
      cost: 0,
    },
  };
}

function candidateSnapshot(candidate: ShopAdviceCandidate): ShopCandidateSnapshot {
  if (candidate.action === "buy" || candidate.action === "sell" || candidate.action === "use") {
    return {
      itemType: candidate.item.itemType,
      category: candidate.item.category,
      attributes: candidate.item.attributes,
      cost: candidate.item.cost,
      isReroll: false,
      isLeave: false,
      isUse: candidate.action === "use",
    };
  }
  if (candidate.action === "reroll") {
    return { itemType: "", category: "other", cost: candidate.cost, isReroll: true, isLeave: false, isUse: false };
  }
  return { itemType: "", category: "other", cost: 0, isReroll: false, isLeave: true, isUse: false };
}

export function buildShopDecisionLog(
  build: ShopBuild,
  ante: number,
  round: number,
  money: number,
  candidates: ReadonlyArray<ShopAdviceCandidate>,
  topIdx: number,
  hold = false,
): ShopDecisionLog | null {
  const base = {
    money,
    ante,
    round,
    offers: candidates.flatMap((c) =>
      c.action === "buy" || c.action === "sell" ? [c.item] : [],
    ),
    handLevels: build.handLevels,
    jokers: build.jokers,
    deckEnhancements: build.deckEnhancements,
    consumablesHeld: build.consumablesHeld,
  };
  const cand = candidates[topIdx];
  if (hold) {
    if (cand === undefined) return null;
    const kind =
      cand.action === "reroll" ? "reroll" : cand.action === "use" ? "use" : "purchase";
    const item =
      cand.action === "buy" || cand.action === "sell" || cand.action === "use"
        ? cand.item
        : null;
    return {
      kind,
      ...base,
      item,
      candidates: candidates.map(candidateSnapshot),
      chosenIndex: topIdx,
    };
  }
  if (cand?.action === "buy" || cand?.action === "sell") {
    return { kind: "purchase", ...base, item: cand.item };
  }
  if (cand?.action === "leave") return { kind: "purchase", ...base, item: null };
  if (cand?.action === "reroll") return { kind: "reroll", ...base, cost: cand.cost };
  return null;
}

export async function createHeadlessShopAgent(
  modelPath: string,
  options: HeadlessShopAgentOptions = {},
): Promise<HeadlessShopAgent> {
  const bytes = readFileSync(modelPath);
  const ort = await import("onnxruntime-web");
  const session = await ort.InferenceSession.create(bytes);
  const jokerCatalog = createJokerCatalog().filter((j) => j.rarity !== "legendary");
  const planetCatalog = createPlanetCatalog();
  const tarotCatalog = createTarotCatalog();
  const spectralCatalog = createSpectralCatalog();
  const withBuildOverride = (build: ShopBuild): ShopBuild =>
    options.buildOverride !== undefined ? options.buildOverride(build) : build;

  async function runSession(
    encoded: Float32Array,
    n: number,
    featureCount: number,
  ): Promise<Float32Array> {
    if (options.scoreCandidates !== undefined) {
      return options.scoreCandidates(encoded, n, featureCount);
    }
    const input = new ort.Tensor("float32", encoded, [n, featureCount]);
    const { logits } = await session.run({ candidates: input });
    return logits.data as Float32Array;
  }

  async function topRanked(
    encoded: Float32Array,
    n: number,
    featureCount: number,
  ): Promise<number> {
    const data = await runSession(encoded, n, featureCount);
    if (options.chooseIndex !== undefined) return options.chooseIndex(data, n);
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
      const discount = (items: ShopItem[]): ShopItem[] =>
        items.map((o) => ({ ...o, price: applyShopDiscount(o.price, ownedVoucherIds) }));
      const jokerCapacity = (): number => MAX_JOKERS + extraJokerSlots(ownedVoucherIds);
      let offers = discount(rollOffers(ownedIds, view.rng, extraShopOfferSlots(ownedVoucherIds)));
      let voucher = pickVoucherForAnte({ ante: view.ante, ownedIds: ownedVoucherIds, rng: view.rng });
      let lastConsumable: Consumable | null = view.lastConsumable;
      let rerollsDone = 0;
      let activity: ShopActivity = emptyShopActivity();
      const spend = (amount: number): void => {
        activity = { ...activity, moneySpent: activity.moneySpent + amount };
      };

      const useConsumable = (consumable: Consumable): void => {
        const result = applyConsumable(
          { deck, money, handStats, lastConsumable, createdJokers: [] },
          consumable,
          { jokers, jokerCatalog, jokerCapacity: jokerCapacity(), tarotCatalog, planetCatalog },
          view.rng,
        );
        deck = result.deck;
        money = result.money;
        handStats = result.handStats;
        lastConsumable = result.lastConsumable;
        for (const created of result.createdJokers) {
          jokers.push(created);
          ownedIds.add(created.id);
        }
      };

      const hold = options.holdConsumables === true;
      const featureCount = hold ? SHOP_INPUT_FEATURES_V2 : SHOP_INPUT_FEATURES;
      const encodeShop = hold ? encodeShopCandidatesV2 : encodeShopCandidates;
      const encodePack = hold ? encodePackCandidatesV2 : encodePackCandidates;
      const inventory: Consumable[] = [];
      const acquireConsumable = (consumable: Consumable): void => {
        if (hold && inventory.length < MAX_CONSUMABLE_SLOTS) inventory.push(consumable);
        else useConsumable(consumable);
      };

      for (;;) {
        const rerollCost = Math.max(0, rerollCostFor(rerollsDone) - rerollCostReduction(ownedVoucherIds));
        const sellList = jokers
          .map((joker, index) => ({ joker, index }))
          .filter(({ joker }) => canSellJoker(joker));
        const visibleOffers = offers.filter(
          (o) => !(isConsumableShopKind(o.kind) && !consumablePurchaseAllowed(money)),
        );
        const candidates: ShopAdviceCandidate[] = [
          ...visibleOffers.map(shopItemCandidate),
          ...sellList.map(({ joker, index }) => jokerSellCandidate(joker, index)),
          ...(hold ? inventory.map((c, i) => consumableUseCandidate(c, i)) : []),
          ...(voucher !== null && voucher.cost <= money ? [voucherCandidate(voucher)] : []),
          ...(rerollsDone < MAX_REROLLS && rerollCost <= money && rerollAllowed(money, ownedVoucherIds, ownedIds) ? [{ action: "reroll" as const, cost: rerollCost }] : []),
          { action: "leave" as const },
        ];
        const build = withBuildOverride(shopBuildSummary({ jokers, handStats, deck, consumablesHeld: hold ? inventory.length : lastConsumable !== null ? 1 : 0 }));
        const topIdx = await topRanked(encodeShop({ money, ante: view.ante, round: view.round, build, candidates }), candidates.length, featureCount);
        if (options.onShopDecision !== undefined) {
          const log = buildShopDecisionLog(build, view.ante, view.round, money, candidates, topIdx, hold);
          if (log !== null) options.onShopDecision(log);
        }
        const choice = candidates[topIdx];
        if (choice === undefined || choice.action === "leave") break;

        if (choice.action === "reroll") {
          money -= rerollCost;
          spend(rerollCost);
          activity = { ...activity, rerolls: activity.rerolls + 1 };
          rerollsDone += 1;
          offers = discount(rollOffers(ownedIds, view.rng, extraShopOfferSlots(ownedVoucherIds)));
          continue;
        }

        if (choice.action === "sell") {
          const target = sellList[topIdx - visibleOffers.length];
          if (target === undefined) break;
          money += jokerSellValue(target.joker);
          jokers.splice(target.index, 1);
          ownedIds.delete(target.joker.id);
          activity = { ...activity, jokersSold: activity.jokersSold + 1 };
          continue;
        }

        if (choice.action === "use") {
          const inventoryIndex = topIdx - visibleOffers.length - sellList.length;
          const consumable = inventory[inventoryIndex];
          if (consumable === undefined) break;
          inventory.splice(inventoryIndex, 1);
          useConsumable(consumable);
          continue;
        }

        if (choice.action === "buy" && choice.item.itemType === "voucher" && voucher !== null) {
          money -= voucher.cost;
          spend(voucher.cost);
          activity = { ...activity, vouchersBought: activity.vouchersBought + 1 };
          ownedVoucherIds = new Set(ownedVoucherIds).add(voucher.id);
          voucher = null;
          continue;
        }

        const offer = visibleOffers[topIdx];
        if (offer === undefined || offer.price > money) break;
        money -= offer.price;
        spend(offer.price);
        offers = offers.filter((o) => o !== offer);

        if (offer.kind === "joker" && jokers.length < jokerCapacity()) {
          jokers.push(offer.joker);
          ownedIds.add(offer.joker.id);
          activity = { ...activity, jokersBought: activity.jokersBought + 1 };
        } else if (offer.kind === "planet") {
          acquireConsumable({ kind: "planet", card: offer.planet });
          activity = { ...activity, consumablesBought: activity.consumablesBought + 1 };
        } else if (offer.kind === "tarot") {
          acquireConsumable({ kind: "tarot", card: offer.tarot });
          activity = { ...activity, consumablesBought: activity.consumablesBought + 1 };
        } else if (offer.kind === "spectral") {
          acquireConsumable({ kind: "spectral", card: offer.spectral });
          activity = { ...activity, consumablesBought: activity.consumablesBought + 1 };
        } else if (offer.kind === "pack") {
          activity = { ...activity, packsOpened: activity.packsOpened + 1 };
          let packOptions = [...offer.pack.options];
          let picksLeft = packPickLimit(offer.pack.variant);
          while (picksLeft > 0 && packOptions.length > 0) {
            const packCandidates: PackAdviceCandidate[] = [...packOptions.map(packOptionToCandidate), { action: "skip" }];
            const packBuild = withBuildOverride(shopBuildSummary({ jokers, handStats, deck, consumablesHeld: lastConsumable !== null ? 1 : 0 }));
            const pickIdx = await topRanked(encodePack({ money, ante: view.ante, round: view.round, picksRemaining: picksLeft, build: packBuild, candidates: packCandidates }), packCandidates.length, featureCount);
            const picked = packOptions[pickIdx];
            if (picked === undefined) break;
            packOptions = packOptions.filter((_, i) => i !== pickIdx);
            picksLeft -= 1;
            activity = { ...activity, packPicks: activity.packPicks + 1 };
            if (picked.kind === "joker" && jokers.length < jokerCapacity()) { jokers.push(picked.joker); ownedIds.add(picked.joker.id); }
            else if (picked.kind === "planet") { acquireConsumable({ kind: "planet", card: picked.planet }); }
            else if (picked.kind === "tarot") { acquireConsumable({ kind: "tarot", card: picked.tarot }); }
            else if (picked.kind === "spectral") { acquireConsumable({ kind: "spectral", card: picked.spectral }); }
          }
        }
      }

      for (const consumable of inventory) useConsumable(consumable);

      return { jokers, money, handStats, ownedVoucherIds, deck, lastConsumable, activity };
    },
  };
}
