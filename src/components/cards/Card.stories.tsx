import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Card from "./Card";
import { withGame } from "../../stories/decorators";
import { makeCard } from "../../stories/fixtures";

const meta = {
  title: "Cards/Card",
  component: Card,
  decorators: [withGame()],
  args: {
    card: makeCard(1, "A", "spades"),
    onToggle: fn(),
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AceOfSpades: Story = {};

export const RedSuit: Story = {
  args: { card: makeCard(2, "Q", "hearts") },
};

export const FaceCard: Story = {
  args: { card: makeCard(3, "K", "clubs") },
};

export const Selected: Story = {
  args: { card: makeCard(4, "10", "diamonds"), selected: true },
};

export const Debuffed: Story = {
  args: { card: makeCard(5, "J", "spades"), debuffed: true },
};

export const FaceDown: Story = {
  args: { card: makeCard(6, "8", "hearts", { faceDown: true }) },
};

export const StoneCard: Story = {
  args: { card: makeCard(7, "2", "clubs", { enhancement: "stone" }) },
};

export const GlassWithRedSeal: Story = {
  args: {
    card: makeCard(8, "A", "diamonds", { enhancement: "glass", seal: "red" }),
  },
};

export const GoldWithGoldSeal: Story = {
  args: {
    card: makeCard(9, "K", "hearts", { enhancement: "gold", seal: "gold" }),
  },
};

export const PolychromeEdition: Story = {
  args: { card: makeCard(10, "Q", "spades", { edition: "polychrome" }) },
};

export const LuckyScoring: Story = {
  args: {
    card: makeCard(11, "7", "hearts", { enhancement: "lucky" }),
    scoring: true,
    luckyMultScoring: true,
  },
};
