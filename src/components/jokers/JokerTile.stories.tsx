import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import JokerTile from "./JokerTile";
import { withGame } from "../../stories/decorators";
import { createJokerCatalog, withEdition, type Joker } from "../../items/jokers";

const CATALOG = createJokerCatalog();

function jokerById(id: string): Joker {
  const joker = CATALOG.find((j) => j.id === id);
  if (!joker) throw new Error(`Unknown joker id: ${id}`);
  return joker;
}

const meta = {
  title: "Jokers/JokerTile",
  component: JokerTile,
  decorators: [withGame()],
  render: (args) => (
    <ul className="jokers-list" style={{ listStyle: "none" }}>
      <JokerTile {...args} />
    </ul>
  ),
  args: {
    joker: jokerById("plus-four-mult"),
    idx: 0,
    jokers: [jokerById("plus-four-mult")],
    pulse: 0,
    isDragging: false,
    draggable: false,
    reorderable: false,
    sellable: false,
    tooltipId: "joker-tile-story-tooltip",
    tooltipAnchorRect: null,
    onOpenTooltip: fn(),
    onCloseTooltip: fn(),
    onMove: fn(),
    onSellAt: fn(),
    onTileDragStart: fn(),
    onTileDragEnd: fn(),
  },
} satisfies Meta<typeof JokerTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sellable: Story = {
  args: {
    sellable: true,
    draggable: true,
  },
};

export const Reorderable: Story = {
  args: {
    reorderable: true,
    draggable: true,
  },
};

export const FoilEdition: Story = {
  args: {
    joker: withEdition(jokerById("greedy-joker"), "foil"),
    jokers: [withEdition(jokerById("greedy-joker"), "foil")],
  },
};

export const Pulsing: Story = {
  args: {
    pulse: 2,
  },
};
