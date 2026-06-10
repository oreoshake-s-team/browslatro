import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Jokers from "./Jokers";
import { withGame } from "../../stories/decorators";
import {
  PERISHABLE_LIFE,
  createJokerCatalog,
  type Joker,
} from "../../items/jokers";

const CATALOG = createJokerCatalog();

function jokerById(id: string): Joker {
  const joker = CATALOG.find((j) => j.id === id);
  if (!joker) throw new Error(`Unknown joker id: ${id}`);
  return joker;
}

const meta = {
  title: "Jokers/Jokers",
  component: Jokers,
  decorators: [withGame()],
  args: {
    jokers: [],
    onReorder: fn(),
    onSell: fn(),
    onDragStart: fn(),
    onDragEnd: fn(),
    onConsumableDrop: fn(),
  },
} satisfies Meta<typeof Jokers>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyTray: Story = {};

export const PartiallyFilled: Story = {
  args: {
    jokers: [jokerById("plus-four-mult"), jokerById("greedy-joker")],
  },
};

export const FullWithEditions: Story = {
  args: {
    jokers: [
      jokerById("plus-four-mult"),
      { ...jokerById("the-duo"), edition: "foil" as const },
      { ...jokerById("fibonacci"), edition: "holographic" as const },
      { ...jokerById("baron"), edition: "polychrome" as const },
      { ...jokerById("joker-stencil"), edition: "negative" as const },
    ],
  },
};

export const WithStickers: Story = {
  args: {
    jokers: [
      {
        ...jokerById("greedy-joker"),
        stickers: [{ kind: "eternal" as const }],
      },
      {
        ...jokerById("even-steven"),
        stickers: [{ kind: "perishable" as const, roundsHeld: 1 }],
      },
      {
        ...jokerById("odd-todd"),
        stickers: [
          { kind: "perishable" as const, roundsHeld: PERISHABLE_LIFE },
        ],
      },
      {
        ...jokerById("half-joker"),
        stickers: [{ kind: "rental" as const }],
      },
    ],
  },
};

export const PulsingOnScore: Story = {
  args: {
    jokers: [jokerById("jolly-joker"), jokerById("zany-joker")],
    pulseCounters: { "jolly-joker": 2, "zany-joker": 1 },
  },
};

export const ConsumableDropTarget: Story = {
  args: {
    jokers: [jokerById("fortune-teller")],
    consumableDropEnabled: true,
  },
};
