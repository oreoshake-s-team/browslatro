import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import ModifierPackPicker from "./ModifierPackPicker";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "Game/ModifierPackPicker",
  component: ModifierPackPicker,
  decorators: [withGame()],
} satisfies Meta<typeof ModifierPackPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByText("Force a Pack pool in next shop"),
    );
  },
};
