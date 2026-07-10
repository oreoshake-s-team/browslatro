import type { Meta, StoryObj } from "@storybook/react-vite";
import HandSection from "./HandSection";
import GameSessionProvider from "./GameSessionProvider";
import { withGame } from "../../stories/decorators";
import { MIXED_HAND } from "../../stories/fixtures";
import type { GameState } from "../../store/game";

function dealMixedHand(s: GameState): void {
  s.setDealt({ hand: [...MIXED_HAND], remaining: s.baseDeckCards.slice(8) });
}

const meta = {
  title: "Game/HandSection",
  component: HandSection,
  decorators: [
    withGame(dealMixedHand),
    (Story) => (
      <GameSessionProvider>
        <Story />
      </GameSessionProvider>
    ),
  ],
} satisfies Meta<typeof HandSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dealt: Story = {};

export const WithSelection: Story = {
  decorators: [
    withGame((s) => {
      dealMixedHand(s);
      s.setSelectedIds(new Set([9101, 9102]));
    }),
  ],
};
