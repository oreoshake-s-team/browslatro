import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import ModifierJokerPicker from "./ModifierJokerPicker";
import { createJokerCatalog } from "../../items/jokers";
import { withGame } from "../../stories/decorators";

async function expandPicker(canvasElement: HTMLElement): Promise<void> {
  await userEvent.click(
    within(canvasElement).getByText("Add a specific Joker"),
  );
}

const meta = {
  title: "Game/ModifierJokerPicker",
  component: ModifierJokerPicker,
  decorators: [withGame()],
} satisfies Meta<typeof ModifierJokerPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    await expandPicker(canvasElement);
  },
};

export const SecondPage: Story = {
  play: async ({ canvasElement }) => {
    await expandPicker(canvasElement);
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Next joker page" }),
    );
  },
};

export const SlotsFull: Story = {
  decorators: [withGame((s) => s.setJokers(createJokerCatalog().slice(0, 5)))],
  play: async ({ canvasElement }) => {
    await expandPicker(canvasElement);
  },
};
