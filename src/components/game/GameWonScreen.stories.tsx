import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import GameWonScreen from "./GameWonScreen";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "Game/GameWonScreen",
  component: GameWonScreen,
  parameters: { layout: "fullscreen" },
  decorators: [withGame()],
  args: {
    info: { finalAnte: 8, finalMoney: 47, handsPlayed: 63, blindsSkipped: 3 },
    onNewRun: fn(),
    onEndless: fn(),
  },
} satisfies Meta<typeof GameWonScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoSkipsBigBank: Story = {
  args: {
    info: { finalAnte: 8, finalMoney: 132, handsPlayed: 88, blindsSkipped: 0 },
  },
};

export const ScrapedByWithSkips: Story = {
  args: {
    info: { finalAnte: 8, finalMoney: 2, handsPlayed: 41, blindsSkipped: 9 },
  },
};
