import type { Meta, StoryObj } from "@storybook/react-vite";
import DiscardPile from "./DiscardPile";
import type { Card as CardType } from "../../cards/types";
import { RANKS, SUITS } from "../../cards/deck";
import { withGame } from "../../stories/decorators";
import { FLUSH_HAND, MIXED_HAND, makeCard } from "../../stories/fixtures";

const LARGE_PILE: ReadonlyArray<CardType> = SUITS.slice(0, 2).flatMap(
  (suit, suitIndex) =>
    RANKS.map((rank, rankIndex) =>
      makeCard(7100 + suitIndex * RANKS.length + rankIndex, rank, suit),
    ),
);

const meta = {
  title: "Cards/DiscardPile",
  component: DiscardPile,
  decorators: [withGame()],
  args: {
    discarded: MIXED_HAND,
  },
} satisfies Meta<typeof DiscardPile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { discarded: [] },
};

export const SingleCard: Story = {
  args: { discarded: [makeCard(7001, "A", "spades")] },
};

export const EnhancedTopCard: Story = {
  args: {
    discarded: [
      ...FLUSH_HAND,
      makeCard(7002, "Q", "hearts", {
        enhancement: "glass",
        seal: "red",
        edition: "polychrome",
      }),
    ],
  },
};

export const LargePile: Story = {
  args: { discarded: LARGE_PILE },
};
