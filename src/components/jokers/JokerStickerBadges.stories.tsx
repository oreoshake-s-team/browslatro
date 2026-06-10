import type { Meta, StoryObj } from "@storybook/react-vite";
import JokerStickerBadges from "./JokerStickerBadges";
import { withGame } from "../../stories/decorators";
import {
  PERISHABLE_LIFE,
  createJokerCatalog,
  type Joker,
  type JokerSticker,
} from "../../items/jokers";

const BASE_JOKER = createJokerCatalog()[0];

function withStickers(stickers: ReadonlyArray<JokerSticker>): Joker {
  return { ...BASE_JOKER, stickers };
}

const meta = {
  title: "Jokers/JokerStickerBadges",
  component: JokerStickerBadges,
  decorators: [withGame()],
  args: {
    joker: withStickers([{ kind: "eternal" }]),
  },
} satisfies Meta<typeof JokerStickerBadges>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Eternal: Story = {};

export const PerishableFresh: Story = {
  args: {
    joker: withStickers([{ kind: "perishable", roundsHeld: 0 }]),
  },
};

export const PerishableLastRound: Story = {
  args: {
    joker: withStickers([
      { kind: "perishable", roundsHeld: PERISHABLE_LIFE - 1 },
    ]),
  },
};

export const PerishableDebuffed: Story = {
  args: {
    joker: withStickers([
      { kind: "perishable", roundsHeld: PERISHABLE_LIFE },
    ]),
  },
};

export const Rental: Story = {
  args: {
    joker: withStickers([{ kind: "rental" }]),
  },
};

export const AllStickers: Story = {
  args: {
    joker: withStickers([
      { kind: "eternal" },
      { kind: "perishable", roundsHeld: 2 },
      { kind: "rental" },
    ]),
  },
};
