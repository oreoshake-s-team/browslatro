import type { Meta, StoryObj } from "@storybook/react-vite";
import TarotTooltip from "./TarotTooltip";
import { createTarotCatalog, type TarotCard } from "../../items/tarots";
import { withGame } from "../../stories/decorators";

const tarots = createTarotCatalog();

function tarotById(id: string): TarotCard {
  const found = tarots.find((card) => card.id === id);
  if (!found) throw new Error(`unknown tarot: ${id}`);
  return found;
}

const meta = {
  title: "Game/TarotTooltip",
  component: TarotTooltip,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    id: "tarot-tooltip-story",
    card: tarotById("the-magician"),
    anchorRect: new DOMRect(300, 200, 96, 134),
  },
} satisfies Meta<typeof TarotTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TheMagician: Story = {};

export const TheHermit: Story = {
  args: { card: tarotById("the-hermit") },
};

export const Death: Story = {
  args: { card: tarotById("death") },
};

export const WheelOfFortune: Story = {
  args: { card: tarotById("wheel-of-fortune") },
};
