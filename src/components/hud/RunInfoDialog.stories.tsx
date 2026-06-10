import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import RunInfoDialog from "./RunInfoDialog";
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
  "High Card": 5,
  Pair: 12,
  "Two Pair": 6,
  "Three of a Kind": 3,
  Straight: 1,
  Flush: 8,
  "Four of a Kind": 1,
};

const upgradedStats: HandStats = {
  ...createDefaultHandStats(),
  "High Card": { chips: 15, multiplier: 2, level: 2 },
  Pair: { chips: 30, multiplier: 4, level: 3 },
  Flush: { chips: 65, multiplier: 8, level: 3 },
  "Four of a Kind": { chips: 90, multiplier: 10, level: 2 },
};

async function showVouchersTab(canvasElement: HTMLElement): Promise<void> {
  const body = within(canvasElement.ownerDocument.body);
  await userEvent.click(await body.findByRole("tab", { name: "Vouchers" }));
}

const meta = {
  title: "HUD/RunInfoDialog",
  component: RunInfoDialog,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    handPlayCounts: emptyHandCounts(),
    handStats: createDefaultHandStats(),
    ownedVouchers: [],
    onClose: fn(),
  },
} satisfies Meta<typeof RunInfoDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MidRunHands: Story = {
  args: {
    handPlayCounts: playedCounts,
    handStats: upgradedStats,
  },
};

export const VouchersTabEmpty: Story = {
  play: async ({ canvasElement }) => {
    await showVouchersTab(canvasElement);
  },
};

export const VouchersTabOwned: Story = {
  args: {
    handPlayCounts: playedCounts,
    handStats: upgradedStats,
    ownedVouchers: pickVouchers(
      "overstock",
      "clearance-sale",
      "grabber",
      "seed-money",
      "telescope",
      "directors-cut",
    ),
  },
  play: async ({ canvasElement }) => {
    await showVouchersTab(canvasElement);
  },
};
