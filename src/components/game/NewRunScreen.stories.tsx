import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import NewRunScreen from "./NewRunScreen";
import { withGame } from "../../stories/decorators";
import { DEFAULT_STAKE } from "../../items/stakes";
import { DEFAULT_DECK } from "../../items/decks";

const meta = {
  title: "Game/NewRunScreen",
  component: NewRunScreen,
  parameters: { layout: "fullscreen" },
  decorators: [withGame()],
  args: {
    initialStake: DEFAULT_STAKE,
    initialDeck: DEFAULT_DECK,
    onConfirm: fn(),
  },
} satisfies Meta<typeof NewRunScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BlueDeckPreselected: Story = {
  args: { initialDeck: "blue-deck" },
};

export const GoldStakePreselected: Story = {
  args: { initialStake: "gold" },
};

export const GreenDeckBlackStake: Story = {
  args: { initialDeck: "green-deck", initialStake: "black" },
};
