import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import BlindSelectScreen from "./BlindSelectScreen";
import { withGame } from "../../stories/decorators";
import {
  availableBosses,
  createBossCatalog,
  pickBossForAnte,
} from "../../items/bosses";
import { rollAnteSkipOffers } from "../../items/tags";

const BOSS = pickBossForAnte({ ante: 1, rng: () => 0 });
const SKIP_REWARDS = rollAnteSkipOffers(() => 0);

const meta = {
  title: "Game/BlindSelectScreen",
  component: BlindSelectScreen,
  parameters: { layout: "fullscreen" },
  decorators: [withGame()],
  args: {
    ante: 1,
    currentBlind: 1,
    boss: BOSS,
    stake: "white",
    onPlay: fn(),
    onSkip: fn(),
    tags: [],
    skipRewards: SKIP_REWARDS,
  },
} satisfies Meta<typeof BlindSelectScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SmallBlind: Story = {};

export const BigBlind: Story = {
  args: { currentBlind: 2 },
};

export const BossBlind: Story = {
  args: { currentBlind: 3 },
};

export const WithTagsHeld: Story = {
  args: {
    currentBlind: 2,
    tags: ["investment", "charm", "d6"],
  },
};

export const LateAnteWithBossControls: Story = {
  args: {
    ante: 4,
    currentBlind: 3,
    boss: pickBossForAnte({ ante: 4, rng: () => 0.5 }),
    stake: "gold",
    bossOptions: availableBosses(createBossCatalog(), 4),
    onSetBoss: fn(),
    onRerollBoss: fn(),
    bossRerollsRemaining: 1,
    bossRerollCost: 10,
    canAffordBossReroll: true,
  },
};
