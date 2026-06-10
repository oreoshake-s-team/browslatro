import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import RoundLostModal from "./RoundLostModal";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "Game/RoundLostModal",
  component: RoundLostModal,
  parameters: { layout: "fullscreen" },
  decorators: [withGame()],
  args: {
    info: { roundScore: 240, requiredScore: 300 },
    onContinue: fn(),
  },
} satisfies Meta<typeof RoundLostModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const JustShort: Story = {
  args: { info: { roundScore: 299, requiredScore: 300 } },
};

export const Blowout: Story = {
  args: { info: { roundScore: 850, requiredScore: 5000 } },
};
