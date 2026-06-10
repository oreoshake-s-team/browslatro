import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import ModifierSpectralPicker from "./ModifierSpectralPicker";
import { createSpectralCatalog } from "../../items/spectrals";
import { withGame } from "../../stories/decorators";

async function expandPicker(canvasElement: HTMLElement): Promise<void> {
  await userEvent.click(
    within(canvasElement).getByText("Add a specific Spectral"),
  );
}

const meta = {
  title: "Game/ModifierSpectralPicker",
  component: ModifierSpectralPicker,
  decorators: [withGame()],
} satisfies Meta<typeof ModifierSpectralPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    await expandPicker(canvasElement);
  },
};

export const SlotsFull: Story = {
  decorators: [
    withGame((s) => {
      const catalog = createSpectralCatalog();
      s.setConsumables([
        { kind: "spectral", card: catalog[1] },
        { kind: "spectral", card: catalog[2] },
      ]);
    }),
  ],
  play: async ({ canvasElement }) => {
    await expandPicker(canvasElement);
  },
};
