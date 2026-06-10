import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import ModifierPanel from "./ModifierPanel";
import { FINAL_ANTE } from "../../constants";
import { withGame } from "../../stories/decorators";

async function expandPanel(canvasElement: HTMLElement): Promise<void> {
  await userEvent.click(within(canvasElement).getByText("Apply modifiers"));
}

const meta = {
  title: "Game/ModifierPanel",
  component: ModifierPanel,
  decorators: [withGame()],
} satisfies Meta<typeof ModifierPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    await expandPanel(canvasElement);
  },
};

export const FinalAnteReached: Story = {
  decorators: [withGame((s) => s.setAnte(FINAL_ANTE))],
  play: async ({ canvasElement }) => {
    await expandPanel(canvasElement);
  },
};

export const ForceProbabilitiesEnabled: Story = {
  decorators: [withGame((s) => s.setForceProbabilities(true))],
  play: async ({ canvasElement }) => {
    await expandPanel(canvasElement);
  },
};
