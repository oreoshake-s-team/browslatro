import type { Meta, StoryObj } from "@storybook/react-vite";
import RunProgress from "./RunProgress";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "HUD/RunProgress",
  component: RunProgress,
  decorators: [withGame()],
  args: {
    ante: 1,
    round: 1,
    money: 4,
  },
} satisfies Meta<typeof RunProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MidRun: Story = {
  args: {
    ante: 4,
    round: 11,
    money: 38,
  },
};

export const LateRun: Story = {
  args: {
    ante: 8,
    round: 23,
    money: 120,
  },
};

export const Broke: Story = {
  args: {
    ante: 3,
    round: 8,
    money: 0,
  },
};
