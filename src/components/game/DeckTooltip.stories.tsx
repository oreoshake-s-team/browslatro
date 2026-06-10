import type { Meta, StoryObj } from "@storybook/react-vite";
import DeckTooltip from "./DeckTooltip";
import { getDeckSpec } from "../../items/decks";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "Game/DeckTooltip",
  component: DeckTooltip,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    id: "deck-tooltip-story",
    spec: getDeckSpec("red-deck"),
    anchorRect: new DOMRect(300, 200, 96, 134),
  },
} satisfies Meta<typeof DeckTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RedDeck: Story = {};

export const BlackDeck: Story = {
  args: { spec: getDeckSpec("black-deck") },
};

export const GreenDeck: Story = {
  args: { spec: getDeckSpec("green-deck") },
};

export const PlasmaDeck: Story = {
  args: { spec: getDeckSpec("plasma-deck") },
};
