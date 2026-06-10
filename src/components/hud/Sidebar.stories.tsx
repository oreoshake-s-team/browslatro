import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Sidebar from "./Sidebar";
import { withGame } from "../../stories/decorators";
import { emptyHandCounts, type HandPlayCounts } from "./handPlayCounts";
import {
  createDefaultHandStats,
  type HandStats,
} from "../../scoring/handStats";
import { createBossCatalog, type BossBlind } from "../../items/bosses";
import {
  VOUCHER_CATALOG,
  type Voucher,
  type VoucherId,
} from "../../items/vouchers";
import type { ScoringEvent } from "../../scoring/scoringTrace";

function findBoss(id: string): BossBlind {
  const boss = createBossCatalog().find((entry) => entry.id === id);
  if (!boss) throw new Error(`Unknown boss: ${id}`);
  return boss;
}

function pickVouchers(...ids: VoucherId[]): ReadonlyArray<Voucher> {
  return ids.map((id) => {
    const voucher = VOUCHER_CATALOG.find((entry) => entry.id === id);
    if (!voucher) throw new Error(`Unknown voucher: ${id}`);
    return voucher;
  });
}

const playedCounts: HandPlayCounts = {
  ...emptyHandCounts(),
  "High Card": 4,
  Pair: 11,
  "Two Pair": 5,
  "Three of a Kind": 2,
  Flush: 7,
  "Full House": 1,
};

const upgradedStats: HandStats = {
  ...createDefaultHandStats(),
  "High Card": { chips: 15, multiplier: 2, level: 2 },
  Pair: { chips: 30, multiplier: 4, level: 3 },
  Flush: { chips: 50, multiplier: 6, level: 2 },
};

const FLUSH_TRACE: ReadonlyArray<ScoringEvent> = [
  { kind: "hand-base", chips: 35, mult: 4, handLabel: "Flush", level: 2 },
  { kind: "chips-delta", amount: 11, source: "A♠ rank" },
  { kind: "chips-delta", amount: 10, source: "K♠ rank" },
  { kind: "mult-delta", amount: 4, source: "Joker" },
  { kind: "mult-times", factor: 1.5, source: "Polychrome edition" },
  { kind: "money-delta", amount: 3, source: "Gold card held" },
];

const BOSS_ROUND_TRACE: ReadonlyArray<ScoringEvent> = [
  {
    kind: "boss-adjustment",
    description: "Base Chips and Mult halved",
    source: "The Flint",
  },
  { kind: "hand-base", chips: 25, mult: 3, handLabel: "Flush", level: 2 },
  { kind: "chips-delta", amount: 11, source: "A♠ rank" },
  { kind: "chips-delta", amount: 10, source: "K♠ rank" },
  { kind: "mult-delta", amount: 4, source: "Joker" },
  { kind: "mult-times", factor: 1.5, source: "Polychrome edition" },
  { kind: "card-destroyed", cardLabel: "K♦", source: "Glass card shattered" },
  { kind: "money-delta", amount: 3, source: "Gold card held" },
  { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
  { kind: "chips-delta", amount: 8, source: "8♥ rank" },
  { kind: "chips-delta", amount: 8, source: "8♣ rank" },
  { kind: "mult-delta", amount: 2, source: "Misprint" },
  { kind: "money-delta", amount: 1, source: "Interest" },
];

const meta = {
  title: "HUD/Sidebar",
  component: Sidebar,
  decorators: [
    withGame(),
    (Story) => (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100vh",
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
  args: {
    blind: 1,
    ante: 1,
    round: 1,
    money: 4,
    chips: 0,
    multiplier: 0,
    roundScore: 0,
    requiredScore: 300,
    selectedHand: null,
    remainingHands: 4,
    remainingDiscards: 3,
    handPlayCounts: emptyHandCounts(),
    handStats: createDefaultHandStats(),
    ownedVouchers: [],
    currentBoss: null,
    firstPlayedHandLabel: null,
    scoringEvents: [],
    onNewGame: fn(),
    onHighVisibilityChange: fn(),
    onAnimationSpeedChange: fn(),
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HandSelected: Story = {
  args: {
    blind: 2,
    round: 2,
    money: 9,
    chips: 35,
    multiplier: 4,
    roundScore: 180,
    requiredScore: 450,
    selectedHand: { label: "Flush", chips: 35, multiplier: 4 },
    remainingHands: 3,
    remainingDiscards: 2,
    scoringEvents: FLUSH_TRACE,
  },
};

export const BossBlindLockedHand: Story = {
  args: {
    blind: 3,
    ante: 2,
    round: 6,
    money: 18,
    roundScore: 750,
    requiredScore: 1600,
    remainingHands: 2,
    remainingDiscards: 1,
    handPlayCounts: playedCounts,
    currentBoss: findBoss("the-mouth"),
    firstPlayedHandLabel: "Flush",
    scoringEvents: FLUSH_TRACE,
  },
};

export const LateRunRichTrace: Story = {
  args: {
    blind: 3,
    ante: 6,
    round: 17,
    money: 52,
    chips: 50,
    multiplier: 6,
    roundScore: 21450,
    requiredScore: 40000,
    selectedHand: { label: "Flush", chips: 50, multiplier: 6 },
    remainingHands: 1,
    remainingDiscards: 0,
    handPlayCounts: playedCounts,
    handStats: upgradedStats,
    ownedVouchers: pickVouchers(
      "overstock",
      "grabber",
      "seed-money",
      "telescope",
    ),
    currentBoss: findBoss("the-flint"),
    scoringEvents: BOSS_ROUND_TRACE,
  },
};
