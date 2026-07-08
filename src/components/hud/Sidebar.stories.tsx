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
import type { VoucherId } from "../../items/vouchers";
import type { ScoringEvent } from "../../scoring/scoringTrace";

function findBoss(id: string): BossBlind {
  const boss = createBossCatalog().find((entry) => entry.id === id);
  if (!boss) throw new Error(`Unknown boss: ${id}`);
  return boss;
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
    onNewGame: fn(),
    onHighVisibilityChange: fn(),
    onAnimationSpeedChange: fn(),
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withGame()],
};

export const HandSelected: Story = {
  decorators: [
    withGame((s) => {
      s.setBlind(2);
      s.setRound(2);
      s.setMoney(9);
      s.setChips(35);
      s.setMultiplier(4);
      s.setRoundScore(180);
      s.setSelectedHand({ label: "Flush", chips: 35, multiplier: 4 });
      s.setRemainingHands(3);
      s.setRemainingDiscards(2);
      s.setScoringEvents(FLUSH_TRACE);
    }),
  ],
};

export const BossBlindLockedHand: Story = {
  decorators: [
    withGame((s) => {
      s.setBlind(3);
      s.setAnte(2);
      s.setRound(6);
      s.setMoney(18);
      s.setRoundScore(750);
      s.setRemainingHands(2);
      s.setRemainingDiscards(1);
      s.setHandPlayCounts(playedCounts);
      s.setCurrentBoss(findBoss("the-mouth"));
      s.setHandHistoryThisRound(["Flush"]);
      s.setScoringEvents(FLUSH_TRACE);
    }),
  ],
};

export const LateRunRichTrace: Story = {
  decorators: [
    withGame((s) => {
      s.setBlind(3);
      s.setAnte(6);
      s.setRound(17);
      s.setMoney(52);
      s.setChips(50);
      s.setMultiplier(6);
      s.setRoundScore(21450);
      s.setSelectedHand({ label: "Flush", chips: 50, multiplier: 6 });
      s.setRemainingHands(1);
      s.setRemainingDiscards(0);
      s.setHandPlayCounts(playedCounts);
      s.setHandStats(upgradedStats);
      s.setOwnedVoucherIds(
        new Set<VoucherId>(["overstock", "grabber", "seed-money", "telescope"]),
      );
      s.setCurrentBoss(findBoss("the-flint"));
      s.setScoringEvents(BOSS_ROUND_TRACE);
    }),
  ],
};
