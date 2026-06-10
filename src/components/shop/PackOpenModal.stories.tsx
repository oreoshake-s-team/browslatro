import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import PackOpenModal from "./PackOpenModal";
import { withGame } from "../../stories/decorators";
import { MIXED_HAND, makeCard } from "../../stories/fixtures";
import type { PackOffer } from "../../items/packs";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog, type TarotCard } from "../../items/tarots";
import { createJokerCatalog, type Joker } from "../../items/jokers";

const PLANETS = createPlanetCatalog();
const TAROTS = createTarotCatalog();
const JOKERS = createJokerCatalog();

function tarotById(id: string): TarotCard {
  const tarot = TAROTS.find((t) => t.id === id);
  if (!tarot) throw new Error(`Unknown tarot id: ${id}`);
  return tarot;
}

function jokerById(id: string): Joker {
  const joker = JOKERS.find((j) => j.id === id);
  if (!joker) throw new Error(`Unknown joker id: ${id}`);
  return joker;
}

const CELESTIAL_NORMAL: PackOffer = {
  pool: "celestial",
  variant: "normal",
  options: PLANETS.slice(0, 3).map((planet) => ({
    kind: "planet" as const,
    planet,
  })),
};

const CELESTIAL_MEGA: PackOffer = {
  pool: "celestial",
  variant: "mega",
  options: PLANETS.slice(0, 5).map((planet) => ({
    kind: "planet" as const,
    planet,
  })),
};

const ARCANA_NORMAL: PackOffer = {
  pool: "arcana",
  variant: "normal",
  options: [
    { kind: "tarot" as const, tarot: tarotById("the-magician") },
    { kind: "tarot" as const, tarot: tarotById("the-lovers") },
    { kind: "tarot" as const, tarot: tarotById("the-hermit") },
  ],
};

const BUFFOON_NORMAL: PackOffer = {
  pool: "buffoon",
  variant: "normal",
  options: [
    { kind: "joker" as const, joker: jokerById("plus-four-mult") },
    {
      kind: "joker" as const,
      joker: {
        ...jokerById("business-card"),
        stickers: [
          { kind: "eternal" as const },
          { kind: "perishable" as const, roundsHeld: 2 },
        ],
      },
    },
  ],
};

const STANDARD_NORMAL: PackOffer = {
  pool: "standard",
  variant: "normal",
  options: [
    {
      kind: "playing-card" as const,
      card: makeCard(9601, "A", "spades", { enhancement: "glass" }),
    },
    {
      kind: "playing-card" as const,
      card: makeCard(9602, "K", "hearts", { seal: "red" }),
    },
    {
      kind: "playing-card" as const,
      card: makeCard(9603, "7", "clubs", {
        enhancement: "lucky",
        seal: "gold",
      }),
    },
  ],
};

const meta = {
  title: "Shop/PackOpenModal",
  component: PackOpenModal,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    pack: CELESTIAL_NORMAL,
    picksRemaining: 1,
    onPick: fn(),
    onClose: fn(),
    onSelectPreviewCard: fn(),
    onReorderPreview: fn(),
  },
} satisfies Meta<typeof PackOpenModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CelestialPack: Story = {};

export const ArcanaWithPreviewSelection: Story = {
  args: {
    pack: ARCANA_NORMAL,
    previewHand: MIXED_HAND,
    previewSelectedIds: new Set<number>([9101, 9103]),
  },
};

export const StandardWithPreviewHand: Story = {
  args: {
    pack: STANDARD_NORMAL,
    previewHand: MIXED_HAND,
    previewSelectedIds: new Set<number>(),
  },
};

export const BuffoonWithStickers: Story = {
  args: {
    pack: BUFFOON_NORMAL,
    jokerSlotsFull: false,
  },
};

export const MegaTwoPicks: Story = {
  args: {
    pack: CELESTIAL_MEGA,
    picksRemaining: 2,
  },
};

export const MegaPartiallyPicked: Story = {
  args: {
    pack: CELESTIAL_MEGA,
    picksRemaining: 1,
    pickedIndices: new Set<number>([0, 2]),
  },
};
