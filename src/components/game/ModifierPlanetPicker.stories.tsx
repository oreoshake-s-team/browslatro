import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import ModifierPlanetPicker from "./ModifierPlanetPicker";
import { createPlanetCatalog } from "../../items/planets";
import { withGame } from "../../stories/decorators";

async function expandPicker(canvasElement: HTMLElement): Promise<void> {
  await userEvent.click(
    within(canvasElement).getByText("Add a specific Planet"),
  );
}

const meta = {
  title: "Game/ModifierPlanetPicker",
  component: ModifierPlanetPicker,
  decorators: [withGame()],
} satisfies Meta<typeof ModifierPlanetPicker>;

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
      const catalog = createPlanetCatalog();
      s.setConsumables([
        { kind: "planet", card: catalog[0] },
        { kind: "planet", card: catalog[1] },
      ]);
    }),
  ],
  play: async ({ canvasElement }) => {
    await expandPicker(canvasElement);
  },
};
