import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import DeckPile from "./DeckPile";
import type { Card as CardType } from "../../cards/types";
import { RANKS, SUITS } from "../../cards/deck";
import { withGame } from "../../stories/decorators";
import { makeCard } from "../../stories/fixtures";

const FULL_DECK: ReadonlyArray<CardType> = SUITS.flatMap((suit, suitIndex) =>
  RANKS.map((rank, rankIndex) =>
    makeCard(8000 + suitIndex * RANKS.length + rankIndex, rank, suit),
  ),
);

const meta = {
  title: "Cards/DeckPile",
  component: DeckPile,
  decorators: [withGame()],
  args: {
    remaining: FULL_DECK,
    onConsumableDrop: fn(),
    onJokerDrop: fn(),
  },
} satisfies Meta<typeof DeckPile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PartiallyDealt: Story = {
  args: { remaining: FULL_DECK.slice(8) },
};

export const NearlyEmpty: Story = {
  args: { remaining: FULL_DECK.slice(FULL_DECK.length - 3) },
};

export const Empty: Story = {
  args: { remaining: [] },
};

export const ConsumableSellTarget: Story = {
  args: { consumableDropEnabled: true },
};

export const JokerSellTarget: Story = {
  args: { jokerDropEnabled: true },
};
