import type { Meta, StoryObj } from "@storybook/react-vite";
import PlanetTooltip from "./PlanetTooltip";
import { createPlanetCatalog, type PlanetCard } from "../../items/planets";
import { withGame } from "../../stories/decorators";

const planets = createPlanetCatalog();

function planetById(id: string): PlanetCard {
  const found = planets.find((card) => card.id === id);
  if (!found) throw new Error(`unknown planet: ${id}`);
  return found;
}

const meta = {
  title: "Game/PlanetTooltip",
  component: PlanetTooltip,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    id: "planet-tooltip-story",
    card: planetById("mercury"),
    anchorRect: new DOMRect(300, 200, 96, 134),
  },
} satisfies Meta<typeof PlanetTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mercury: Story = {};

export const Saturn: Story = {
  args: { card: planetById("saturn") },
};

export const Neptune: Story = {
  args: { card: planetById("neptune") },
};

export const PlanetX: Story = {
  args: { card: planetById("planet-x") },
};
