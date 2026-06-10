import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import ModifierTarotPicker from "./ModifierTarotPicker";
import { createTarotCatalog } from "../../items/tarots";
import { withGame } from "../../stories/decorators";

async function expandPicker(canvasElement: HTMLElement): Promise<void> {
  await userEvent.click(
    within(canvasElement).getByText("Add a specific Tarot"),
  );
}

const meta = {
  title: "Game/ModifierTarotPicker",
  component: ModifierTarotPicker,
  decorators: [withGame()],
} satisfies Meta<typeof ModifierTarotPicker>;

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
      const catalog = createTarotCatalog();
      s.setConsumables([
        { kind: "tarot", card: catalog[0] },
        { kind: "tarot", card: catalog[1] },
      ]);
    }),
  ],
  play: async ({ canvasElement }) => {
    await expandPicker(canvasElement);
  },
};
