import type { Meta, StoryObj } from "@storybook/react-vite";
import DeckSummary from "./DeckSummary";
import type { Card as CardType } from "../../cards/types";
import { RANKS, SUITS } from "../../cards/deck";
import { withGame } from "../../stories/decorators";
import { FLUSH_HAND, makeCard } from "../../stories/fixtures";

const FULL_DECK: ReadonlyArray<CardType> = SUITS.flatMap((suit, suitIndex) =>
  RANKS.map((rank, rankIndex) =>
    makeCard(8000 + suitIndex * RANKS.length + rankIndex, rank, suit),
  ),
);

const SPADE_HEAVY: ReadonlyArray<CardType> = [
  ...FULL_DECK.filter((card) => card.suit === "spades"),
  makeCard(8100, "A", "hearts"),
  makeCard(8101, "K", "diamonds"),
  makeCard(8102, "Q", "clubs"),
];

const meta = {
  title: "Cards/DeckSummary",
  component: DeckSummary,
  decorators: [withGame()],
  args: {
    remaining: FULL_DECK,
  },
} satisfies Meta<typeof DeckSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PartiallyDealt: Story = {
  args: { remaining: FULL_DECK.slice(12) },
};

export const SpadeHeavy: Story = {
  args: { remaining: SPADE_HEAVY },
};

export const FewCardsLeft: Story = {
  args: { remaining: FLUSH_HAND },
};

export const Empty: Story = {
  args: { remaining: [] },
};
