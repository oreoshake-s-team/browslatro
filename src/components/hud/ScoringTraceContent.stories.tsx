import type { Meta, StoryObj } from "@storybook/react-vite";
import ScoringTraceContent from "./ScoringTraceContent";
import { withGame } from "../../stories/decorators";
import type { ScoringEvent } from "../../scoring/scoringTrace";

const SINGLE_HAND_TRACE: ReadonlyArray<ScoringEvent> = [
  { kind: "hand-base", chips: 35, mult: 4, handLabel: "Flush", level: 2 },
  { kind: "chips-delta", amount: 11, source: "A♠ rank" },
  { kind: "chips-delta", amount: 10, source: "K♠ rank" },
  { kind: "mult-delta", amount: 4, source: "Joker" },
  { kind: "mult-times", factor: 1.5, source: "Polychrome edition" },
  { kind: "money-delta", amount: 3, source: "Gold card held" },
];

const MULTI_HAND_TRACE: ReadonlyArray<ScoringEvent> = [
  { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
  { kind: "chips-delta", amount: 8, source: "8♥ rank" },
  { kind: "chips-delta", amount: 8, source: "8♣ rank" },
  { kind: "mult-delta", amount: 2, source: "Misprint" },
  { kind: "hand-base", chips: 35, mult: 4, handLabel: "Flush", level: 2 },
  { kind: "chips-delta", amount: 11, source: "A♠ rank" },
  { kind: "mult-times", factor: 1.5, source: "Polychrome edition" },
  { kind: "card-destroyed", cardLabel: "K♦", source: "Glass card shattered" },
  { kind: "money-delta", amount: 3, source: "Gold card held" },
  { kind: "money-delta", amount: 1, source: "Interest" },
];

const PRE_HAND_TRACE: ReadonlyArray<ScoringEvent> = [
  {
    kind: "boss-adjustment",
    description: "Base Chips and Mult halved",
    source: "The Flint",
  },
  {
    kind: "boss-adjustment",
    description: "Hand treated as one level lower",
    source: "The Arm",
  },
];

const meta = {
  title: "HUD/ScoringTraceContent",
  component: ScoringTraceContent,
  decorators: [withGame()],
  args: {
    events: [],
  },
} satisfies Meta<typeof ScoringTraceContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleHand: Story = {
  args: {
    events: SINGLE_HAND_TRACE,
  },
};

export const MultipleHands: Story = {
  args: {
    events: MULTI_HAND_TRACE,
  },
};

export const PreHandBossAdjustments: Story = {
  args: {
    events: PRE_HAND_TRACE,
  },
};
