import { SHOP_ATTRIBUTE_FEATURES } from "./shopCandidateAttributes";
import { VOUCHER_FEATURES } from "./voucherFeatures";
import { PACK_FEATURES } from "./packFeatures";
import type { PackRankInput, ShopBuild, ShopRankInput } from "./shopEncoding";
import type {
  PackAdviceCandidate,
  ShopAdviceCandidate,
  ShopAdviceItem,
} from "./types";

export interface GoldenOffer {
  readonly itemType: string;
  readonly category: string;
  readonly attributes?: ReadonlyArray<number>;
  readonly voucherFeatures?: ReadonlyArray<number>;
  readonly packFeatures?: ReadonlyArray<number>;
  readonly advancesHands?: ReadonlyArray<string>;
  readonly id: string;
  readonly name: string;
  readonly cost: number;
}

export interface GoldenOption {
  readonly optionType: string;
  readonly category: string;
  readonly attributes?: ReadonlyArray<number>;
  readonly advancesHands?: ReadonlyArray<string>;
  readonly id: string;
  readonly name: string;
}

export interface GoldenCandidate {
  readonly itemType: string;
  readonly category: string;
  readonly cost: number;
  readonly attributes?: ReadonlyArray<number>;
  readonly voucherFeatures?: ReadonlyArray<number>;
  readonly packFeatures?: ReadonlyArray<number>;
  readonly advancesHands?: ReadonlyArray<string>;
  readonly isReroll?: boolean;
  readonly isLeave?: boolean;
  readonly isUse?: boolean;
  readonly id?: string;
  readonly name?: string;
}

export interface GoldenRecord {
  readonly schemaVersion?: number;
  readonly runSeed?: number;
  readonly ante: number;
  readonly round: number;
  readonly blind?: number;
  readonly money: number;
  readonly kind: "purchase" | "reroll" | "pack-pick" | "use";
  readonly item?: { readonly id: string };
  readonly offers?: ReadonlyArray<GoldenOffer>;
  readonly options?: ReadonlyArray<GoldenOption>;
  readonly cost?: number;
  readonly pickedIndex?: number | null;
  readonly picksRemaining?: number;
  readonly candidates?: ReadonlyArray<GoldenCandidate>;
  readonly chosenIndex?: number;
  readonly handLevels?: Readonly<Record<string, number>>;
  readonly jokers?: ReadonlyArray<{
    readonly effectKind: string;
    readonly rarity: string;
  }>;
  readonly deckEnhancements?: Readonly<Record<string, number>>;
  readonly consumablesHeld?: number;
}

export interface GoldenCase {
  readonly record: GoldenRecord;
  readonly candidates: ReadonlyArray<ReadonlyArray<number>>;
  readonly chosenIndex: number;
}

function buildFromGolden(rec: GoldenRecord): ShopBuild {
  return {
    handLevels: rec.handLevels ?? {},
    jokers: rec.jokers ?? [],
    deckEnhancements: rec.deckEnhancements ?? {},
    consumablesHeld: rec.consumablesHeld ?? 0,
  };
}

function itemFromCandidate(c: GoldenCandidate): ShopAdviceItem {
  return {
    id: c.id ?? "",
    name: c.name ?? "",
    itemType: c.itemType,
    category: c.category,
    attributes: c.attributes,
    voucherFeatures: c.voucherFeatures,
    packFeatures: c.packFeatures,
    advancesHands: c.advancesHands,
    cost: c.cost,
    description: "",
  };
}

function itemFromOffer(o: GoldenOffer): ShopAdviceItem {
  return {
    id: o.id,
    name: o.name,
    itemType: o.itemType,
    category: o.category,
    attributes: o.attributes,
    voucherFeatures: o.voucherFeatures,
    packFeatures: o.packFeatures,
    advancesHands: o.advancesHands,
    cost: o.cost,
    description: "",
  };
}

export function recordToInput(rec: GoldenRecord): ShopRankInput | PackRankInput {
  const { money, ante, round } = rec;

  if (rec.candidates) {
    const candidates: ShopAdviceCandidate[] = rec.candidates.map((c) => {
      if (c.isUse) return { action: "use", item: itemFromCandidate(c) };
      if (c.isReroll) return { action: "reroll", cost: c.cost };
      if (c.isLeave) return { action: "leave" };
      return { action: "buy", item: itemFromCandidate(c) };
    });
    return { money, ante, round, build: buildFromGolden(rec), candidates };
  }

  if (rec.kind === "reroll") {
    const candidates: ShopAdviceCandidate[] = (rec.offers ?? []).map((o) => ({
      action: "buy" as const,
      item: itemFromOffer(o),
    }));
    candidates.push({ action: "reroll", cost: rec.cost ?? 0 });
    candidates.push({ action: "leave" });
    return { money, ante, round, build: buildFromGolden(rec), candidates };
  }

  if (rec.kind === "pack-pick") {
    const candidates: PackAdviceCandidate[] = (rec.options ?? []).map((o) => ({
      action: "pick" as const,
      option: {
        id: o.id,
        name: o.name,
        optionType: o.optionType,
        category: o.category,
        attributes: o.attributes,
        advancesHands: o.advancesHands,
        description: "",
      },
    }));
    candidates.push({ action: "skip" });
    return {
      money,
      ante,
      round,
      picksRemaining: rec.picksRemaining ?? 0,
      build: buildFromGolden(rec),
      candidates,
    };
  }

  const candidates: ShopAdviceCandidate[] = (rec.offers ?? []).map((o) => ({
    action: "buy" as const,
    item: itemFromOffer(o),
  }));
  candidates.push({ action: "leave" });
  return { money, ante, round, build: buildFromGolden(rec), candidates };
}

export function goldenChosenIndex(rec: GoldenRecord): number {
  if (rec.candidates) return rec.chosenIndex ?? -1;
  if (rec.kind === "reroll") return (rec.offers ?? []).length;
  if (rec.kind === "pack-pick") {
    return rec.pickedIndex ?? (rec.options ?? []).length;
  }
  const offers = rec.offers ?? [];
  if (rec.item == null) return offers.length;
  return offers.findIndex((o) => o.id === rec.item?.id);
}

function ramp(count: number, start: number, step: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const raw = start + i * step;
    return Math.round(((raw % 1) + 1) % 1 * 100) / 100;
  });
}

const JOKER_ATTRS = ramp(SHOP_ATTRIBUTE_FEATURES, 0.13, 0.07);
const XMULT_ATTRS = ramp(SHOP_ATTRIBUTE_FEATURES, 0.26, 0.07);
const BLUEPRINT_ATTRS = ramp(SHOP_ATTRIBUTE_FEATURES, 0.4, 0.05);
const BLANK_VOUCHER = ramp(VOUCHER_FEATURES, 0.09, 0.05);
const BUFFOON_PACK = ramp(PACK_FEATURES, 0.31, 0.06);

export const GOLDEN_INPUTS: ReadonlyArray<GoldenRecord> = [
  {
    schemaVersion: 2,
    runSeed: 1,
    ante: 3,
    round: 8,
    blind: 0,
    money: 14,
    kind: "purchase",
    item: { id: "jolly" },
    offers: [
      {
        itemType: "joker",
        id: "jolly",
        name: "Jolly Joker",
        cost: 4,
        category: "joker-mult",
        attributes: JOKER_ATTRS,
        advancesHands: ["Pair"],
      },
      {
        itemType: "joker",
        id: "cavendish",
        name: "Cavendish",
        cost: 6,
        category: "joker-x-mult",
        attributes: XMULT_ATTRS,
      },
      { itemType: "planet", id: "mercury", name: "Mercury", cost: 3, category: "planet" },
    ],
    handLevels: { Pair: 3, Flush: 2 },
    jokers: [
      { effectKind: "x-mult-mult", rarity: "uncommon" },
      { effectKind: "mult-add", rarity: "common" },
    ],
    deckEnhancements: { steel: 4 },
    consumablesHeld: 1,
  },
  {
    schemaVersion: 2,
    runSeed: 2,
    ante: 5,
    round: 14,
    blind: 0,
    money: 20,
    kind: "purchase",
    item: { id: "blank" },
    offers: [
      {
        itemType: "voucher",
        id: "blank",
        name: "Blank",
        cost: 10,
        category: "other",
        voucherFeatures: BLANK_VOUCHER,
      },
      {
        itemType: "pack",
        id: "buffoon-pack",
        name: "Buffoon Pack",
        cost: 6,
        category: "other",
        packFeatures: BUFFOON_PACK,
      },
    ],
  },
  {
    schemaVersion: 2,
    runSeed: 3,
    ante: 2,
    round: 5,
    blind: 0,
    money: 8,
    kind: "reroll",
    cost: 5,
    offers: [
      { itemType: "tarot", id: "the-fool", name: "The Fool", cost: 3, category: "tarot-create" },
      { itemType: "spectral", id: "familiar", name: "Familiar", cost: 4, category: "spectral" },
    ],
    handLevels: { "Two Pair": 2 },
    consumablesHeld: 0,
  },
  {
    schemaVersion: 2,
    runSeed: 4,
    ante: 4,
    round: 10,
    blind: 0,
    money: 11,
    kind: "pack-pick",
    picksRemaining: 1,
    pickedIndex: 0,
    options: [
      {
        optionType: "playing-card",
        id: "ace-spades",
        name: "Ace of Spades",
        category: "other",
        advancesHands: ["Straight"],
      },
      { optionType: "tarot", id: "the-star", name: "The Star", category: "tarot-enhance" },
    ],
    handLevels: { Straight: 4 },
  },
  {
    schemaVersion: 2,
    runSeed: 5,
    ante: 1,
    round: 2,
    blind: 0,
    money: 6,
    kind: "pack-pick",
    picksRemaining: 2,
    pickedIndex: null,
    options: [
      { optionType: "joker", id: "joker-basic", name: "Joker", category: "joker-mult" },
      { optionType: "planet", id: "venus", name: "Venus", category: "planet" },
    ],
  },
  {
    schemaVersion: 2,
    runSeed: 6,
    ante: 2,
    round: 4,
    blind: 0,
    money: 9,
    kind: "use",
    chosenIndex: 0,
    consumablesHeld: 1,
    candidates: [
      {
        itemType: "tarot",
        category: "other",
        cost: 0,
        id: "use:the-fool:0",
        name: "The Fool",
        isUse: true,
      },
      { itemType: "", category: "other", cost: 0, isLeave: true },
    ],
  },
  {
    schemaVersion: 2,
    runSeed: 7,
    ante: 3,
    round: 6,
    blind: 0,
    money: 12,
    kind: "purchase",
    chosenIndex: 0,
    handLevels: { Pair: 2 },
    jokers: [{ effectKind: "retrigger-hand", rarity: "rare" }],
    candidates: [
      {
        itemType: "joker",
        category: "joker-x-mult",
        cost: 10,
        id: "blueprint",
        name: "Blueprint",
        attributes: BLUEPRINT_ATTRS,
        advancesHands: ["Pair"],
        isUse: false,
      },
      {
        itemType: "tarot",
        category: "other",
        cost: 0,
        id: "use:strength:0",
        name: "Strength",
        isUse: true,
      },
      { itemType: "", category: "other", cost: 0, isLeave: true },
    ],
  },
];
