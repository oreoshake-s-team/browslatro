import type { Meta, StoryObj } from "@storybook/react-vite";
import RoundProgress from "./RoundProgress";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "HUD/RoundProgress",
  component: RoundProgress,
  decorators: [withGame()],
  args: {
    remainingHands: 4,
    remainingDiscards: 3,
  },
} satisfies Meta<typeof RoundProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PartiallyUsed: Story = {
  args: {
    remainingHands: 2,
    remainingDiscards: 1,
  },
};

export const LastHandNoDiscards: Story = {
  args: {
    remainingHands: 1,
    remainingDiscards: 0,
  },
};

export const Exhausted: Story = {
  args: {
    remainingHands: 0,
    remainingDiscards: 0,
  },
};

export const VoucherBoosted: Story = {
  args: {
    remainingHands: 6,
    remainingDiscards: 5,
  },
};
