import type { Meta, StoryObj } from "@storybook/react-vite";
import ConsumablesSection from "./ConsumablesSection";
import { withGame } from "../../stories/decorators";
import { createTarotCatalog } from "../../items/tarots";

const meta = {
  title: "Game/ConsumablesSection",
  component: ConsumablesSection,
  decorators: [withGame()],
} satisfies Meta<typeof ConsumablesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithTarot: Story = {
  decorators: [
    withGame((s) => {
      s.setConsumables([{ kind: "tarot", card: createTarotCatalog()[0] }]);
    }),
  ],
};
