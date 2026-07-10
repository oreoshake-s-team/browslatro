import type { Meta, StoryObj } from "@storybook/react-vite";
import PlayControls from "./PlayControls";
import GameSessionProvider from "./GameSessionProvider";
import { withGame } from "../../stories/decorators";
import { MIXED_HAND } from "../../stories/fixtures";
import type { GameState } from "../../store/game";

function dealMixedHand(s: GameState): void {
  s.setDealt({ hand: [...MIXED_HAND], remaining: s.baseDeckCards.slice(8) });
}

const meta = {
  title: "Game/PlayControls",
  component: PlayControls,
  decorators: [
    withGame(dealMixedHand),
    (Story) => (
      <GameSessionProvider>
        <Story />
      </GameSessionProvider>
    ),
  ],
} satisfies Meta<typeof PlayControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoSelection: Story = {};

export const HandSelected: Story = {
  decorators: [
    withGame((s) => {
      dealMixedHand(s);
      s.setSelectedIds(new Set([9101, 9102]));
      s.setSelectedHand({ label: "Pair", chips: 32, multiplier: 2 });
      s.setChips(32);
      s.setMultiplier(2);
    }),
  ],
};

export const NoDiscardsRemaining: Story = {
  decorators: [
    withGame((s) => {
      dealMixedHand(s);
      s.setSelectedIds(new Set([9101, 9102]));
      s.setSelectedHand({ label: "Pair", chips: 32, multiplier: 2 });
      s.setRemainingDiscards(0);
    }),
  ],
};
