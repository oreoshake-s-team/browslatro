import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import JokerGrantAcknowledge from "./JokerGrantAcknowledge";
import { withGame } from "../../stories/decorators";
import {
  createJokerCatalog,
  createLegendaryJokerCatalog,
  type Joker,
} from "../../items/jokers";

const CATALOG = createJokerCatalog();

function jokerById(id: string): Joker {
  const joker = CATALOG.find((j) => j.id === id);
  if (!joker) throw new Error(`Unknown joker id: ${id}`);
  return joker;
}

const meta = {
  title: "Jokers/JokerGrantAcknowledge",
  component: JokerGrantAcknowledge,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    jokers: [jokerById("misprint")],
    onAcknowledge: fn(),
  },
} satisfies Meta<typeof JokerGrantAcknowledge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleJoker: Story = {};

export const MultipleJokers: Story = {
  args: {
    jokers: [
      jokerById("scholar"),
      jokerById("bull"),
      jokerById("baron"),
    ],
  },
};

export const LegendaryJokers: Story = {
  args: {
    jokers: createLegendaryJokerCatalog(),
  },
};
