import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import LazyChunkErrorBoundary from "./LazyChunkErrorBoundary";
import { withGame } from "../../stories/decorators";

function Boom(): never {
  throw new Error(
    "Failed to fetch dynamically imported module: /assets/chunk-demo.js",
  );
}

const meta = {
  title: "System/LazyChunkErrorBoundary",
  component: LazyChunkErrorBoundary,
  decorators: [withGame()],
  args: {
    children: <p>Lazy chunk content rendered successfully.</p>,
    onReload: fn(),
  },
} satisfies Meta<typeof LazyChunkErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RendersChildren: Story = {};

export const ChunkLoadErrorCallsOnReload: Story = {
  render: (args) => (
    <div style={{ maxWidth: "26rem", textAlign: "center" }}>
      <p>
        The child below throws a simulated chunk-load error. The boundary
        swallows it and invokes onReload — see the Actions panel.
      </p>
      <LazyChunkErrorBoundary {...args}>
        <Boom />
      </LazyChunkErrorBoundary>
    </div>
  ),
};
