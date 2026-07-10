import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Game from "./Game";
import { withGame } from "../../stories/decorators";
import { MIXED_HAND } from "../../stories/fixtures";
import type { GameState } from "../../store/game";
import type { ShopItem } from "../../items/shop";
import type { PackOffer } from "../../items/packs";
import { createJokerCatalog } from "../../items/jokers";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog } from "../../items/tarots";
import { VOUCHER_CATALOG } from "../../items/vouchers";

const JOKERS = createJokerCatalog();
const PLANETS = createPlanetCatalog();
const TAROTS = createTarotCatalog();

function dealMixedHand(s: GameState): void {
  s.setDealt({ hand: [...MIXED_HAND], remaining: s.baseDeckCards.slice(8) });
}

const CELESTIAL_PACK: PackOffer = {
  pool: "celestial",
  variant: "normal",
  options: [
    { kind: "planet", planet: PLANETS[0] },
    { kind: "planet", planet: PLANETS[1] },
    { kind: "planet", planet: PLANETS[2] },
  ],
};

const SHOP_OFFERS: ReadonlyArray<ShopItem> = [
  { kind: "joker", joker: JOKERS[0], price: 5, sold: false },
  { kind: "tarot", tarot: TAROTS[0], price: 3, sold: false },
  { kind: "pack", pack: CELESTIAL_PACK, price: 4, sold: false },
  {
    kind: "pack",
    pack: {
      pool: "arcana",
      variant: "normal",
      options: [
        { kind: "tarot", tarot: TAROTS[1] },
        { kind: "tarot", tarot: TAROTS[2] },
        { kind: "tarot", tarot: TAROTS[3] },
      ],
    },
    price: 4,
    sold: false,
  },
];

function seedShopOpen(s: GameState): void {
  s.setShopOffers([...SHOP_OFFERS]);
  s.setCurrentAnteVouchers([VOUCHER_CATALOG[0]]);
}

function seedPackOpen(s: GameState): void {
  s.setOpenedPack(CELESTIAL_PACK);
  s.setPackPicksRemaining(1);
}

function seedShopkeeping(s: GameState): void {
  dealMixedHand(s);
  s.setJokers([JOKERS[0]]);
  s.setConsumables([{ kind: "tarot", card: TAROTS[0] }]);
  s.setMoney(24);
}

const meta = {
  title: "Game/Game",
  component: Game,
  parameters: { layout: "fullscreen" },
  decorators: [withGame(dealMixedHand)],
  args: {
    onSubmitHand: fn(),
    onDiscard: fn(),
    canDiscard: true,
    isScoring: false,
    scoringId: null,
    goldScoringId: null,
    steelScoringId: null,
    onCardDiscardEnd: fn(),
  },
} satisfies Meta<typeof Game>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InRound: Story = {};

export const InRoundWithSelection: Story = {
  decorators: [
    withGame((s) => {
      dealMixedHand(s);
      s.setSelectedIds(new Set([9101, 9102]));
      s.setSelectedHand({ label: "Pair", chips: 32, multiplier: 2 });
      s.setChips(32);
      s.setMultiplier(2);
    }),
  ],
};

export const ShopOpen: Story = {
  decorators: [
    withGame((s) => {
      seedShopkeeping(s);
      seedShopOpen(s);
    }),
  ],
};

export const PackOpen: Story = {
  decorators: [
    withGame((s) => {
      dealMixedHand(s);
      seedPackOpen(s);
    }),
  ],
};

export const ShopWithPackOpen: Story = {
  decorators: [
    withGame((s) => {
      seedShopkeeping(s);
      seedShopOpen(s);
      seedPackOpen(s);
    }),
  ],
};
