import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import NopeAnimation from "./NopeAnimation";
import { withGame } from "../../stories/decorators";

function NopeDemo({ triggerKey }: { triggerKey: number }) {
  const [key, setKey] = useState(triggerKey);
  return (
    <div style={{ padding: "2rem", minHeight: "60vh" }}>
      <button type="button" onClick={() => setKey((prev) => prev + 1)}>
        Trigger nope
      </button>
      <NopeAnimation triggerKey={key} />
    </div>
  );
}

const meta = {
  title: "Game/NopeAnimation",
  component: NopeAnimation,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    triggerKey: 0,
  },
} satisfies Meta<typeof NopeAnimation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Triggered: Story = {
  render: (args) => <NopeDemo {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Trigger nope" }));
  },
};
