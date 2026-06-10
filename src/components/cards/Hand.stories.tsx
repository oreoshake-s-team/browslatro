import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Hand from "./Hand";
import type { Card as CardType } from "../../cards/types";
import { RANKS, SUITS } from "../../cards/deck";
import { withGame } from "../../stories/decorators";
import { FLUSH_HAND, MIXED_HAND, makeCard } from "../../stories/fixtures";

const DECK_REMAINDER: ReadonlyArray<CardType> = SUITS.flatMap(
  (suit, suitIndex) =>
    RANKS.map((rank, rankIndex) =>
      makeCard(8000 + suitIndex * RANKS.length + rankIndex, rank, suit),
    ),
).slice(MIXED_HAND.length);

const meta = {
  title: "Cards/Hand",
  component: Hand,
  decorators: [withGame()],
  args: {
    hand: MIXED_HAND,
    remaining: DECK_REMAINDER,
    selectedIds: new Set<number>(),
    discardingIds: new Set<number>(),
    onToggleCard: fn(),
    onCardDiscardEnd: fn(),
    onDisplayOrderChange: fn(),
    onConsumableSellDrop: fn(),
    onJokerSellDrop: fn(),
  },
} satisfies Meta<typeof Hand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FlushHand: Story = {
  args: { hand: FLUSH_HAND },
};

export const WithSelection: Story = {
  args: { selectedIds: new Set([9101, 9102, 9104]) },
};

export const DebuffedClubs: Story = {
  args: { debuffedIds: new Set([9104, 9107]) },
};

export const ScoringCard: Story = {
  args: {
    selectedIds: new Set([9101, 9102]),
    scoringId: 9101,
    scoringPulseTick: 1,
  },
};

export const HeldCardEffects: Story = {
  args: {
    goldScoringId: 9107,
    steelScoringId: 9106,
  },
};

export const LuckyProcs: Story = {
  args: {
    selectedIds: new Set([9108]),
    luckyMultProcIds: new Set([9108]),
    luckyMoneyProcIds: new Set([9108]),
  },
};

export const EmptyHand: Story = {
  args: { hand: [], remaining: [] },
};
