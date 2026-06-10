import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import ScoringTrace from "./ScoringTrace";
import { withGame } from "../../stories/decorators";
import type { ScoringEvent } from "../../scoring/scoringTrace";

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
  { kind: "money-delta", amount: 1, source: "Interest" },
  { kind: "money-delta", amount: 4, source: "Blind reward" },
];

const meta = {
  title: "HUD/ScoringTrace",
  component: ScoringTrace,
  decorators: [withGame()],
  args: {
    events: [],
  },
} satisfies Meta<typeof ScoringTrace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleHand: Story = {
  args: {
    events: FLUSH_TRACE,
  },
};

export const BossRound: Story = {
  args: {
    events: BOSS_ROUND_TRACE,
  },
};

export const Expanded: Story = {
  args: {
    events: BOSS_ROUND_TRACE,
  },
  parameters: { layout: "fullscreen" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Expand" }),
    );
  },
};
