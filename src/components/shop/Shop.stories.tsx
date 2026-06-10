import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Shop from "./Shop";
import { withGame } from "../../stories/decorators";
import { makeCard } from "../../stories/fixtures";
import {
  MAX_JOKERS,
  createJokerCatalog,
  type Joker,
} from "../../items/jokers";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog } from "../../items/tarots";
import { createPoolSpectralCatalog } from "../../items/spectrals";
import type { ShopItem } from "../../items/shop";
import type { PackOffer } from "../../items/packs";
import {
  VOUCHER_CATALOG,
  type Voucher,
  type VoucherId,
} from "../../items/vouchers";

const JOKERS = createJokerCatalog();
const PLANETS = createPlanetCatalog();
const TAROTS = createTarotCatalog();
const SPECTRALS = createPoolSpectralCatalog();

function jokerById(id: string): Joker {
  const joker = JOKERS.find((j) => j.id === id);
  if (!joker) throw new Error(`Unknown joker id: ${id}`);
  return joker;
}

function voucherById(id: VoucherId): Voucher {
  const voucher = VOUCHER_CATALOG.find((v) => v.id === id);
  if (!voucher) throw new Error(`Unknown voucher id: ${id}`);
  return voucher;
}

const ARCANA_PACK: PackOffer = {
  pool: "arcana",
  variant: "normal",
  options: TAROTS.slice(0, 3).map((tarot) => ({
    kind: "tarot" as const,
    tarot,
  })),
};

const CELESTIAL_PACK: PackOffer = {
  pool: "celestial",
  variant: "jumbo",
  options: PLANETS.slice(0, 5).map((planet) => ({
    kind: "planet" as const,
    planet,
  })),
};

const MIXED_OFFERS: ReadonlyArray<ShopItem> = [
  { kind: "joker", joker: jokerById("greedy-joker"), price: 5, sold: false },
  {
    kind: "joker",
    joker: { ...jokerById("the-duo"), edition: "foil" as const },
    price: 5,
    sold: false,
  },
  { kind: "planet", planet: PLANETS[5], price: 3, sold: false },
  { kind: "tarot", tarot: TAROTS[0], price: 3, sold: false },
  { kind: "spectral", spectral: SPECTRALS[0], price: 4, sold: false },
  {
    kind: "playing-card",
    card: makeCard(501, "A", "hearts", { enhancement: "glass", seal: "red" }),
    price: 4,
    sold: false,
  },
  { kind: "pack", pack: ARCANA_PACK, price: 4, sold: false },
  { kind: "pack", pack: CELESTIAL_PACK, price: 6, sold: false },
];

const meta = {
  title: "Shop/Shop",
  component: Shop,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    money: 25,
    equippedJokerCount: 1,
    jokerCapacity: MAX_JOKERS,
    consumableCount: 0,
    consumableCapacity: 2,
    offers: MIXED_OFFERS,
    vouchers: [voucherById("overstock")],
    soldVoucherIds: new Set<VoucherId>(),
    ownedVoucherIds: new Set<VoucherId>(),
    onBuy: fn(),
    onBuyVoucher: fn(),
    onReroll: fn(),
    onNext: fn(),
    onSetVoucher: fn(),
  },
} satisfies Meta<typeof Shop>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedOffers: Story = {};

export const EverythingSold: Story = {
  args: {
    offers: MIXED_OFFERS.map((offer) => ({ ...offer, sold: true })),
    soldVoucherIds: new Set<VoucherId>(["overstock"]),
  },
};

export const Broke: Story = {
  args: { money: 0 },
};

export const SlotsFull: Story = {
  args: {
    equippedJokerCount: MAX_JOKERS,
    consumableCount: 2,
  },
};

export const VoucherDiscounts: Story = {
  args: {
    money: 18,
    vouchers: [voucherById("liquidation")],
    ownedVoucherIds: new Set<VoucherId>(["clearance-sale", "reroll-surplus"]),
    extraRerollReduction: 1,
    freeFirstReroll: true,
  },
};

export const DevVoucherOverride: Story = {
  args: {
    voucherOptions: VOUCHER_CATALOG,
  },
};
