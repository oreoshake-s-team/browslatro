import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import ScoringTraceModal from "./ScoringTraceModal";
import { withGame } from "../../stories/decorators";
import type { ScoringEvent } from "../../scoring/scoringTrace";

const FULL_ROUND_TRACE: ReadonlyArray<ScoringEvent> = [
  {
    kind: "boss-adjustment",
    description: "Base Chips and Mult halved",
    source: "The Flint",
  },
  { kind: "hand-base", chips: 17, mult: 2, handLabel: "Flush", level: 2 },
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
  { kind: "hand-base", chips: 5, mult: 1, handLabel: "High Card", level: 1 },
  { kind: "chips-delta", amount: 10, source: "10♥ rank" },
  { kind: "money-delta", amount: 1, source: "Interest" },
  { kind: "money-delta", amount: 4, source: "Blind reward" },
];

const meta = {
  title: "HUD/ScoringTraceModal",
  component: ScoringTraceModal,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    events: [],
    onClose: fn(),
  },
} satisfies Meta<typeof ScoringTraceModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FullRound: Story = {
  args: {
    events: FULL_ROUND_TRACE,
  },
};
