import type { Meta, StoryObj } from "@storybook/react-vite";
import CardTooltip from "./CardTooltip";
import { getCardInfo } from "./cardInfo";
import { withGame } from "../../stories/decorators";
import { makeCard } from "../../stories/fixtures";

const ANCHOR_RECT = new DOMRect(300, 200, 96, 134);

const meta = {
  title: "Cards/CardTooltip",
  component: CardTooltip,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    id: "card-tooltip-story",
    info: getCardInfo(makeCard(1, "A", "spades")),
    anchorRect: ANCHOR_RECT,
  },
} satisfies Meta<typeof CardTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const RedSuit: Story = {
  args: { info: getCardInfo(makeCard(2, "Q", "hearts")) },
};

export const GlassEnhancement: Story = {
  args: {
    info: getCardInfo(makeCard(3, "K", "diamonds", { enhancement: "glass" })),
  },
};

export const LuckyEnhancement: Story = {
  args: {
    info: getCardInfo(makeCard(4, "7", "clubs", { enhancement: "lucky" })),
  },
};

export const StoneCard: Story = {
  args: {
    info: getCardInfo(makeCard(5, "2", "clubs", { enhancement: "stone" })),
  },
};

export const FullyDecorated: Story = {
  args: {
    info: getCardInfo(
      makeCard(6, "10", "hearts", {
        enhancement: "steel",
        seal: "blue",
        edition: "holographic",
      }),
    ),
  },
};
