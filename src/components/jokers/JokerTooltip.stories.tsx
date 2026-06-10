import type { Meta, StoryObj } from "@storybook/react-vite";
import JokerTooltip from "./JokerTooltip";
import { withGame } from "../../stories/decorators";
import {
  createJokerCatalog,
  createLegendaryJokerCatalog,
  type Joker,
} from "../../items/jokers";

const CATALOG = createJokerCatalog();
const LEGENDARY_CATALOG = createLegendaryJokerCatalog();

function findJoker(catalog: ReadonlyArray<Joker>, id: string): Joker {
  const joker = catalog.find((j) => j.id === id);
  if (!joker) throw new Error(`Unknown joker id: ${id}`);
  return joker;
}

const ANCHOR_RECT = new DOMRect(140, 24, 140, 150);

const meta = {
  title: "Jokers/JokerTooltip",
  component: JokerTooltip,
  decorators: [withGame()],
  args: {
    id: "joker-tooltip-story",
    joker: findJoker(CATALOG, "plus-four-mult"),
    anchorRect: ANCHOR_RECT,
  },
} satisfies Meta<typeof JokerTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CommonRarity: Story = {};

export const UncommonRarity: Story = {
  args: { joker: findJoker(CATALOG, "the-duo") },
};

export const RareWithDeckProgress: Story = {
  args: { joker: findJoker(CATALOG, "drivers-license") },
};

export const LegendaryRarity: Story = {
  args: { joker: findJoker(LEGENDARY_CATALOG, "triboulet") },
};

export const CounterState: Story = {
  args: {
    joker: {
      ...findJoker(CATALOG, "green-joker"),
      state: { kind: "counter" as const, value: 12 },
    },
  },
};

export const EditionAndStickers: Story = {
  args: {
    joker: {
      ...findJoker(CATALOG, "fibonacci"),
      edition: "polychrome" as const,
      stickers: [
        { kind: "eternal" as const },
        { kind: "perishable" as const, roundsHeld: 3 },
      ],
    },
  },
};
