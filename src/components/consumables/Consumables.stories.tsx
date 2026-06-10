import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Consumables from "./Consumables";
import type { Consumable } from "../../items/consumables";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog } from "../../items/tarots";
import { createSpectralCatalog } from "../../items/spectrals";
import { withGame } from "../../stories/decorators";

function pick<T extends { readonly id: string }>(
  items: ReadonlyArray<T>,
  id: string,
): T {
  const match = items.find((item) => item.id === id);
  if (!match) throw new Error(`Missing catalog entry: ${id}`);
  return match;
}

const planets = createPlanetCatalog();
const tarots = createTarotCatalog();
const spectrals = createSpectralCatalog();

const PLUTO: Consumable = { kind: "planet", card: pick(planets, "pluto") };
const JUPITER: Consumable = { kind: "planet", card: pick(planets, "jupiter") };
const THE_MAGICIAN: Consumable = {
  kind: "tarot",
  card: pick(tarots, "the-magician"),
};
const THE_HERMIT: Consumable = {
  kind: "tarot",
  card: pick(tarots, "the-hermit"),
};
const SIGIL: Consumable = { kind: "spectral", card: pick(spectrals, "sigil") };
const DEJA_VU: Consumable = {
  kind: "spectral",
  card: pick(spectrals, "deja-vu"),
};

const meta = {
  title: "Consumables/Consumables",
  component: Consumables,
  decorators: [withGame()],
  args: {
    consumables: [PLUTO],
    selectedCount: 0,
    onUse: fn(),
    onSell: fn(),
    onDragStart: fn(),
    onDragEnd: fn(),
  },
} satisfies Meta<typeof Consumables>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { consumables: [] },
};

export const FullTray: Story = {
  args: { consumables: [THE_HERMIT, JUPITER] },
};

export const TarotRequiresSelection: Story = {
  args: { consumables: [THE_MAGICIAN, JUPITER] },
};

export const TarotUsableWithSelection: Story = {
  args: { consumables: [THE_MAGICIAN, JUPITER], selectedCount: 2 },
};

export const SpectralCards: Story = {
  args: { consumables: [SIGIL, DEJA_VU], selectedCount: 1 },
};

export const ExpandedCapacity: Story = {
  args: {
    consumables: [PLUTO, THE_MAGICIAN, SIGIL],
    capacity: 4,
    selectedCount: 1,
  },
};
