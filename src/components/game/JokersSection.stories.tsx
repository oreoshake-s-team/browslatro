import type { Meta, StoryObj } from "@storybook/react-vite";
import JokersSection from "./JokersSection";
import { withGame } from "../../stories/decorators";
import { createJokerCatalog } from "../../items/jokers";

const meta = {
  title: "Game/JokersSection",
  component: JokersSection,
  decorators: [withGame()],
} satisfies Meta<typeof JokersSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithJokers: Story = {
  decorators: [
    withGame((s) => {
      s.setJokers(createJokerCatalog().slice(0, 3));
    }),
  ],
};
