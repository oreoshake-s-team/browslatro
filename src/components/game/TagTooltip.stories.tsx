import type { Meta, StoryObj } from "@storybook/react-vite";
import TagTooltip from "./TagTooltip";
import { getTagSpec } from "../../items/tags";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "Game/TagTooltip",
  component: TagTooltip,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    id: "tag-tooltip-story",
    spec: getTagSpec("investment"),
    anchorRect: new DOMRect(300, 200, 96, 134),
  },
} satisfies Meta<typeof TagTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InvestmentTag: Story = {};

export const CharmTag: Story = {
  args: { spec: getTagSpec("charm") },
};

export const NegativeTag: Story = {
  args: { spec: getTagSpec("negative") },
};

export const DoubleTag: Story = {
  args: { spec: getTagSpec("double") },
};
