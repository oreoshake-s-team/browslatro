import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import RoundWonModal from "./RoundWonModal";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "Game/RoundWonModal",
  component: RoundWonModal,
  parameters: { layout: "fullscreen" },
  decorators: [withGame()],
  args: {
    info: {
      roundScore: 320,
      requiredScore: 300,
      baseReward: 3,
      walletAtPayout: 0,
      interestWallet: 0,
      interest: 0,
      goldHeldCount: 0,
      remainingHandsCount: 0,
    },
    onContinue: fn(),
  },
} satisfies Meta<typeof RoundWonModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SmallWin: Story = {};

export const FullBreakdown: Story = {
  args: {
    info: {
      roundScore: 612,
      requiredScore: 450,
      baseReward: 4,
      walletAtPayout: 23,
      interestWallet: 23,
      interest: 4,
      goldHeldCount: 2,
      remainingHandsCount: 2,
    },
  },
};

export const WithJokerPayouts: Story = {
  args: {
    info: {
      roundScore: 980,
      requiredScore: 600,
      baseReward: 5,
      walletAtPayout: 12,
      interestWallet: 12,
      interest: 2,
      goldHeldCount: 0,
      remainingHandsCount: 1,
      endOfRoundJokerSteps: [
        { jokerId: "golden-joker", jokerName: "Golden Joker", moneyEarned: 4 },
        { jokerId: "cloud-9", jokerName: "Cloud 9", moneyEarned: 3 },
        {
          jokerId: "delayed-gratification",
          jokerName: "Delayed Gratification",
          moneyEarned: 6,
        },
        { jokerId: "business-card", jokerName: "Business Card", moneyEarned: -3 },
      ],
    },
  },
};

export const GreenDeckHandsAndDiscards: Story = {
  args: {
    info: {
      roundScore: 540,
      requiredScore: 450,
      baseReward: 4,
      walletAtPayout: 18,
      interestWallet: 0,
      interest: 0,
      goldHeldCount: 1,
      remainingHandsCount: 2,
      remainingDiscardsCount: 3,
      remainingHandsBonusPerUnit: 2,
      usesHandsAndDiscardsBonus: true,
    },
  },
};
