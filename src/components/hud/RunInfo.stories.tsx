import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import RunInfo from "./RunInfo";
import { withGame } from "../../stories/decorators";
import { emptyHandCounts, type HandPlayCounts } from "./handPlayCounts";
import {
  createDefaultHandStats,
  type HandStats,
} from "../../scoring/handStats";
import {
  VOUCHER_CATALOG,
  type Voucher,
  type VoucherId,
} from "../../items/vouchers";

function pickVouchers(...ids: VoucherId[]): ReadonlyArray<Voucher> {
  return ids.map((id) => {
    const voucher = VOUCHER_CATALOG.find((entry) => entry.id === id);
    if (!voucher) throw new Error(`Unknown voucher: ${id}`);
    return voucher;
  });
}

const playedCounts: HandPlayCounts = {
  ...emptyHandCounts(),
  "High Card": 3,
  Pair: 9,
  "Two Pair": 4,
  "Three of a Kind": 2,
  Flush: 6,
  "Full House": 1,
};

const upgradedStats: HandStats = {
  ...createDefaultHandStats(),
  "High Card": { chips: 15, multiplier: 2, level: 2 },
  Pair: { chips: 30, multiplier: 4, level: 3 },
  Flush: { chips: 50, multiplier: 6, level: 2 },
};

async function openDialog(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement);
  await userEvent.click(
    await canvas.findByRole("button", { name: "Run info" }),
  );
}

const meta = {
  title: "HUD/RunInfo",
  component: RunInfo,
  decorators: [withGame()],
  args: {
    handPlayCounts: emptyHandCounts(),
    handStats: createDefaultHandStats(),
    ownedVouchers: [],
  },
} satisfies Meta<typeof RunInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DialogOpenFreshRun: Story = {
  play: async ({ canvasElement }) => {
    await openDialog(canvasElement);
  },
};

export const DialogOpenMidRun: Story = {
  args: {
    handPlayCounts: playedCounts,
    handStats: upgradedStats,
    ownedVouchers: pickVouchers("overstock", "grabber", "telescope"),
  },
  play: async ({ canvasElement }) => {
    await openDialog(canvasElement);
  },
};
