import type { Meta, StoryObj } from "@storybook/react-vite";
import HandScore from "./HandScore";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "Game/HandScore",
  component: HandScore,
  decorators: [withGame()],
  args: {
    chips: 0,
    multiplier: 0,
    selectedHand: null,
  },
} satisfies Meta<typeof HandScore>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoHandSelected: Story = {};

export const PairSelected: Story = {
  args: {
    chips: 10,
    multiplier: 2,
    selectedHand: { label: "Pair", chips: 10, multiplier: 2 },
  },
};

export const LeveledFlush: Story = {
  args: {
    chips: 65,
    multiplier: 8,
    selectedHand: { label: "Flush", chips: 35, multiplier: 4 },
    selectedHandLevel: 3,
  },
};

export const BigScore: Story = {
  args: {
    chips: 1240,
    multiplier: 96,
    selectedHand: { label: "Royal Flush", chips: 100, multiplier: 8 },
    selectedHandLevel: 7,
  },
};
