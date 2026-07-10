import type { Meta, StoryObj } from "@storybook/react-vite";
import GameOverlayDeck from "./GameOverlayDeck";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "Game/GameOverlayDeck",
  component: GameOverlayDeck,
  decorators: [withGame()],
} satisfies Meta<typeof GameOverlayDeck>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullDeck: Story = {};

export const WithDestroyedCards: Story = {
  decorators: [
    withGame((s) => {
      s.setDestroyedCardIds(new Set([1, 2, 3]));
    }),
  ],
};
