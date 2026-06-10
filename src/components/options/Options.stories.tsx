import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import Options from "./Options";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "Options/Options",
  component: Options,
  decorators: [withGame()],
  args: {
    onNewGame: fn(),
    onHighVisibilityChange: fn(),
    onAnimationSpeedChange: fn(),
  },
} satisfies Meta<typeof Options>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ModalOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Options" }));
  },
};
