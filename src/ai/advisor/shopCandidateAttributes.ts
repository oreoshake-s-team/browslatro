import type { PackOption } from "../../items/packs";
import type { ShopItem } from "../../items/shop";

const ATTR_FIELDS: ReadonlyArray<readonly [string, number]> = [
  ["amount", 30],
  ["multiplier", 5],
  ["payout", 20],
  ["moneyGain", 20],
  ["chance", 1],
  ["maxTargets", 3],
  ["count", 3],
  ["copies", 3],
  ["addCount", 3],
  ["destroyCount", 3],
  ["times", 3],
  ["handSizeDelta", 2],
  ["chipsDelta", 60],
  ["multDelta", 5],
];

const RARITY_ORDINAL: Record<string, number> = {
  common: 0.25,
  uncommon: 0.5,
  rare: 0.75,
  legendary: 1,
};

export const SHOP_ATTRIBUTE_FEATURES = ATTR_FIELDS.length + 1 + 3;

export const ZERO_SHOP_ATTRIBUTES: ReadonlyArray<number> = new Array(
  SHOP_ATTRIBUTE_FEATURES,
).fill(0);

function numericFields(source: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (source && typeof source === "object") {
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    }
  }
  return out;
}

function familyFlags(kind: string): [number, number, number] {
  const scaling = /stack|grow|per-|every-|decay|shrink|melt|gains/.test(kind) ? 1 : 0;
  const creates = /create|copy|duplicate|transmute|adds/.test(kind) ? 1 : 0;
  const destroys = /destroy|immolate|death|eat/.test(kind) ? 1 : 0;
  return [scaling, creates, destroys];
}

function attributeVector(
  source: unknown,
  rarity: number,
  kind: string,
): number[] {
  const fields = numericFields(source);
  const probed = ATTR_FIELDS.map(([name, norm]) => (fields[name] ?? 0) / norm);
  return [...probed, rarity, ...familyFlags(kind)];
}

export function shopItemAttributes(item: ShopItem): number[] {
  switch (item.kind) {
    case "joker":
      return attributeVector(
        item.joker.effect,
        RARITY_ORDINAL[item.joker.rarity] ?? 0,
        item.joker.effect.kind,
      );
    case "tarot":
      return attributeVector(item.tarot.effect, 0, item.tarot.effect.kind);
    case "planet":
      return attributeVector(item.planet, 0, "");
    case "spectral":
      return attributeVector(item.spectral.effect, 0, item.spectral.effect.kind);
    default:
      return [...ZERO_SHOP_ATTRIBUTES];
  }
}

export function packOptionAttributes(option: PackOption): number[] {
  switch (option.kind) {
    case "joker":
      return attributeVector(
        option.joker.effect,
        RARITY_ORDINAL[option.joker.rarity] ?? 0,
        option.joker.effect.kind,
      );
    case "tarot":
      return attributeVector(option.tarot.effect, 0, option.tarot.effect.kind);
    case "planet":
      return attributeVector(option.planet, 0, "");
    case "spectral":
      return attributeVector(option.spectral.effect, 0, option.spectral.effect.kind);
    default:
      return [...ZERO_SHOP_ATTRIBUTES];
  }
}
