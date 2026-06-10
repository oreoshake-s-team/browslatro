import type { Meta, StoryObj } from "@storybook/react-vite";
import SpectralTooltip from "./SpectralTooltip";
import { createSpectralCatalog, type SpectralCard } from "../../items/spectrals";
import { withGame } from "../../stories/decorators";

const spectrals = createSpectralCatalog();

function spectralById(id: string): SpectralCard {
  const found = spectrals.find((card) => card.id === id);
  if (!found) throw new Error(`unknown spectral: ${id}`);
  return found;
}

const meta = {
  title: "Game/SpectralTooltip",
  component: SpectralTooltip,
  decorators: [withGame()],
  parameters: { layout: "fullscreen" },
  args: {
    id: "spectral-tooltip-story",
    card: spectralById("immolate"),
    anchorRect: new DOMRect(300, 200, 96, 134),
  },
} satisfies Meta<typeof SpectralTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Immolate: Story = {};

export const Ankh: Story = {
  args: { card: spectralById("ankh") },
};

export const BlackHole: Story = {
  args: { card: spectralById("black-hole") },
};

export const TheSoul: Story = {
  args: { card: spectralById("soul") },
};
