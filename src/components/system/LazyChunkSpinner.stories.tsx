import type { Meta, StoryObj } from "@storybook/react-vite";
import LazyChunkSpinner from "./LazyChunkSpinner";
import { withGame } from "../../stories/decorators";

const meta = {
  title: "System/LazyChunkSpinner",
  component: LazyChunkSpinner,
  decorators: [withGame()],
} satisfies Meta<typeof LazyChunkSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {};

export const Overlay: Story = {
  args: { variant: "overlay" },
  parameters: { layout: "fullscreen" },
};

export const CustomLabel: Story = {
  args: { label: "Loading shop…" },
};
