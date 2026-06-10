import type { Meta, StoryObj } from "@storybook/react-vite";
import Round from "./Round";
import { withGame } from "../../stories/decorators";
import { BlindValues } from "../../constants";
import {
  createBossCatalog,
  type BossBlind as BossBlindSpec,
} from "../../items/bosses";

function findBoss(id: string): BossBlindSpec {
  const boss = createBossCatalog().find((entry) => entry.id === id);
  if (!boss) throw new Error(`Unknown boss: ${id}`);
  return boss;
}

const meta = {
  title: "HUD/Round",
  component: Round,
  decorators: [withGame()],
  args: {
    blind: 1,
    BlindValues,
    roundScore: 0,
    requiredScore: 300,
    boss: null,
    firstPlayedHandLabel: null,
  },
} satisfies Meta<typeof Round>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BigBlindInProgress: Story = {
  args: {
    blind: 2,
    roundScore: 320,
    requiredScore: 450,
  },
};

export const BossBlind: Story = {
  args: {
    blind: 3,
    roundScore: 850,
    requiredScore: 1200,
    boss: findBoss("the-wall"),
  },
};

export const BossLockedHand: Story = {
  args: {
    blind: 3,
    roundScore: 240,
    requiredScore: 600,
    boss: findBoss("the-mouth"),
    firstPlayedHandLabel: "Flush",
  },
};

export const LateAnte: Story = {
  args: {
    blind: 1,
    roundScore: 23150,
    requiredScore: 50000,
  },
};
