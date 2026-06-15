import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PackOpenModal from "./PackOpenModal";
import type { PackOffer } from "../../items/packs";
import type { Card } from "../../cards/types";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog } from "../../items/tarots";
import {
  PERISHABLE_LIFE,
  createJokerCatalog,
  withEdition,
  type Joker,
  type JokerSticker,
} from "../../items/jokers";
import { createSpectralCatalog } from "../../items/spectrals";
import LiveAnnouncer from "../system/LiveAnnouncer";

const PLANETS = createPlanetCatalog();
const TAROTS = createTarotCatalog();
const JOKERS = createJokerCatalog();
const SPECTRALS = createSpectralCatalog();

function celestialPack(
  variant: "normal" | "jumbo" | "mega",
  count: number,
): PackOffer {
  return {
    pool: "celestial",
    variant,
    options: PLANETS.slice(0, count).map((planet) => ({
      kind: "planet" as const,
      planet,
    })),
  };
}

function arcanaPack(
  variant: "normal" | "jumbo" | "mega",
  count: number,
): PackOffer {
  return {
    pool: "arcana",
    variant,
    options: TAROTS.slice(0, count).map((tarot) => ({
      kind: "tarot" as const,
      tarot,
    })),
  };
}

function buffoonPack(
  variant: "normal" | "jumbo" | "mega",
  count: number,
): PackOffer {
  return {
    pool: "buffoon",
    variant,
    options: JOKERS.slice(0, count).map((joker) => ({
      kind: "joker" as const,
      joker,
    })),
  };
}

function renderModal(
  overrides: Partial<Parameters<typeof PackOpenModal>[0]> = {},
) {
  return render(
    <PackOpenModal
      pack={celestialPack("normal", 3)}
      picksRemaining={1}
      onPick={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />,
  );
}

describe("PackOpenModal", () => {
  test("renders the pack display name as the title", () => {
    renderModal();
    expect(screen.getByRole("heading", { name: /Celestial Pack/ })).toBeInTheDocument();
  });

  test("renders the Jumbo prefix for a Jumbo pack", () => {
    renderModal({ pack: celestialPack("jumbo", 5) });
    expect(
      screen.getByRole("heading", { name: /Jumbo Celestial Pack/ }),
    ).toBeInTheDocument();
  });

  test("renders one option per planet in the pack", () => {
    renderModal({ pack: celestialPack("normal", 3) });
    expect(screen.getAllByRole("button", { name: /^Pick /})).toHaveLength(3);
  });

  test("subtitle reads pick 1 for a Normal pack", () => {
    renderModal({ pack: celestialPack("normal", 3), picksRemaining: 1 });
    expect(screen.getByTestId("pack-open-subtitle")).toHaveTextContent(
      "Pick 1 card to keep",
    );
  });

  test("subtitle shows the picks-remaining counter for a Mega pack", () => {
    renderModal({ pack: celestialPack("mega", 5), picksRemaining: 2 });
    expect(screen.getByTestId("pack-open-subtitle")).toHaveTextContent(
      "Pick 2 cards to keep (2 left)",
    );
  });

  test("clicking a Pick button invokes onPick with the option index", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    renderModal({ onPick });
    await user.click(screen.getByTestId("pack-open-pick-1"));
    expect(onPick).toHaveBeenCalledWith(1);
  });

  test("Pick buttons are disabled when picks remaining hits zero", () => {
    renderModal({ picksRemaining: 0 });
    const picks = screen.getAllByRole("button", { name: /^Pick / });
    for (const btn of picks) expect(btn).toBeDisabled();
  });

  test("close button label is Skip while no picks have been made yet", () => {
    renderModal({ pack: celestialPack("normal", 3), picksRemaining: 1 });
    expect(screen.getByTestId("pack-open-close")).toHaveTextContent("Skip");
  });

  test("close button label is Done after at least one pick on a Mega pack", () => {
    renderModal({ pack: celestialPack("mega", 5), picksRemaining: 1 });
    expect(screen.getByTestId("pack-open-close")).toHaveTextContent("Done");
  });

  test("clicking the close button calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });
    await user.click(screen.getByTestId("pack-open-close"));
    expect(onClose).toHaveBeenCalled();
  });

  test("pressing Escape calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  test("renders the play-area slot above the pack title when provided", () => {
    renderModal({
      playArea: <div data-testid="pack-play-area">play area</div>,
    });
    const playArea = screen.getByTestId("pack-play-area");
    const title = screen.getByRole("heading", { name: /Celestial Pack/ });
    expect(
      Boolean(
        playArea.compareDocumentPosition(title) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  test("does not render a play-area wrapper when no slot is provided (negative)", () => {
    renderModal();
    expect(document.querySelector(".pack-open-play-area")).toBeNull();
  });

  test("an option at a picked index is removed from the list", () => {
    renderModal({
      pack: celestialPack("mega", 5),
      picksRemaining: 1,
      pickedIndices: new Set([0]),
    });
    expect(screen.queryByTestId("pack-open-pick-0")).not.toBeInTheDocument();
  });

  test("other indices still render when one index is picked", () => {
    renderModal({
      pack: celestialPack("mega", 5),
      picksRemaining: 1,
      pickedIndices: new Set([0]),
    });
    expect(screen.getByTestId("pack-open-pick-1")).toBeInTheDocument();
  });

  test("a remaining Pick button stays enabled after one index was picked", () => {
    renderModal({
      pack: celestialPack("mega", 5),
      picksRemaining: 1,
      pickedIndices: new Set([0]),
    });
    expect(screen.getByTestId("pack-open-pick-1")).not.toBeDisabled();
  });

  test("with no picked indices, every option still renders (regression)", () => {
    renderModal({
      pack: celestialPack("mega", 5),
      picksRemaining: 2,
      pickedIndices: new Set(),
    });
    expect(screen.getAllByRole("button", { name: /^Pick / })).toHaveLength(5);
  });
});

describe("PackOpenModal — Arcana pack rendering", () => {
  test("renders the Arcana pack display name", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Arcana Pack/ }),
    ).toBeInTheDocument();
  });

  test("renders one Pick button per tarot in an Arcana pack", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("jumbo", 5)}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button", { name: /^Pick / })).toHaveLength(5);
  });

  test("Pick button label includes the tarot card's name", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const firstTarot = TAROTS[0];
    expect(
      screen.getByRole("button", { name: `Pick ${firstTarot.name}` }),
    ).toBeInTheDocument();
  });

  test("Pick buttons stay enabled for an Arcana pack even when consumable slots are full", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        consumableSlotsFull
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const picks = screen.getAllByRole("button", { name: /^Pick / });
    for (const btn of picks) expect(btn).not.toBeDisabled();
  });

  test("Pick buttons stay enabled in a Celestial pack even when consumable slots are full", () => {
    render(
      <PackOpenModal
        pack={celestialPack("normal", 3)}
        picksRemaining={1}
        consumableSlotsFull
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const picks = screen.getAllByRole("button", { name: /^Pick / });
    for (const btn of picks) expect(btn).not.toBeDisabled();
  });

  test("clicking Pick on a tarot invokes onPick with the option index", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        onPick={onPick}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId("pack-open-pick-2"));
    expect(onPick).toHaveBeenCalledWith(2);
  });
});

describe("PackOpenModal — Buffoon pack rendering", () => {
  test("renders the Buffoon pack display name", () => {
    render(
      <PackOpenModal
        pack={buffoonPack("normal", 2)}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Buffoon Pack/ }),
    ).toBeInTheDocument();
  });

  test("renders one Pick button per joker in a Buffoon pack", () => {
    render(
      <PackOpenModal
        pack={buffoonPack("jumbo", 4)}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button", { name: /^Pick / })).toHaveLength(4);
  });

  test("Pick button label includes the joker's name", () => {
    render(
      <PackOpenModal
        pack={buffoonPack("normal", 2)}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const firstJoker = JOKERS[0];
    expect(
      screen.getByRole("button", { name: `Pick ${firstJoker.name}` }),
    ).toBeInTheDocument();
  });

  test("Pick buttons disable when joker slots are full", () => {
    render(
      <PackOpenModal
        pack={buffoonPack("normal", 2)}
        picksRemaining={1}
        jokerSlotsFull
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const picks = screen.getAllByRole("button", { name: /^Pick / });
    for (const btn of picks) expect(btn).toBeDisabled();
  });

  test("a Negative joker Pick button stays enabled when joker slots are full", () => {
    const negativePack: PackOffer = {
      pool: "buffoon",
      variant: "normal",
      options: [{ kind: "joker", joker: withEdition(JOKERS[0], "negative") }],
    };
    render(
      <PackOpenModal
        pack={negativePack}
        picksRemaining={1}
        jokerSlotsFull
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /^Pick / }),
    ).not.toBeDisabled();
  });

  test("a Buffoon joker option shows its edition badge", () => {
    const foilPack: PackOffer = {
      pool: "buffoon",
      variant: "normal",
      options: [{ kind: "joker", joker: withEdition(JOKERS[0], "foil") }],
    };
    render(
      <PackOpenModal
        pack={foilPack}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("pack-edition-0")).toHaveTextContent("Foil");
  });

  test("Pick buttons stay enabled in a Buffoon pack when only consumable slots are full", () => {
    render(
      <PackOpenModal
        pack={buffoonPack("normal", 2)}
        picksRemaining={1}
        consumableSlotsFull
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const picks = screen.getAllByRole("button", { name: /^Pick / });
    for (const btn of picks) expect(btn).not.toBeDisabled();
  });

  test("Pick buttons stay enabled in an Arcana pack when only joker slots are full", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        jokerSlotsFull
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const picks = screen.getAllByRole("button", { name: /^Pick / });
    for (const btn of picks) expect(btn).not.toBeDisabled();
  });

  test("clicking Pick on a joker invokes onPick with the option index", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <PackOpenModal
        pack={buffoonPack("normal", 2)}
        picksRemaining={1}
        onPick={onPick}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId("pack-open-pick-1"));
    expect(onPick).toHaveBeenCalledWith(1);
  });
});

function spectralPack(
  variant: "normal" | "jumbo" | "mega",
  count: number,
): PackOffer {
  return {
    pool: "spectral",
    variant,
    options: SPECTRALS.slice(0, count).map((spectral) => ({
      kind: "spectral" as const,
      spectral,
    })),
  };
}

function sealSpectralPack(variant: "normal" | "jumbo" | "mega"): PackOffer {
  const seals = SPECTRALS.filter((s) => s.effect.kind === "apply-seal");
  return {
    pool: "spectral",
    variant,
    options: seals.slice(0, 2).map((spectral) => ({
      kind: "spectral" as const,
      spectral,
    })),
  };
}

describe("PackOpenModal — Spectral pack rendering", () => {
  test("renders the Spectral pack display name", () => {
    render(
      <PackOpenModal
        pack={spectralPack("normal", 2)}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Spectral Pack/ }),
    ).toBeInTheDocument();
  });

  test("renders one Pick button per spectral in a Spectral pack", () => {
    render(
      <PackOpenModal
        pack={spectralPack("jumbo", 4)}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button", { name: /^Pick / })).toHaveLength(4);
  });

  test("Pick button label includes the spectral card's name", () => {
    render(
      <PackOpenModal
        pack={spectralPack("normal", 2)}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const firstSpectral = SPECTRALS[0];
    expect(
      screen.getByRole("button", { name: `Pick ${firstSpectral.name}` }),
    ).toBeInTheDocument();
  });

  test("apply-seal Pick buttons disable when consumable slots are full", () => {
    render(
      <PackOpenModal
        pack={sealSpectralPack("normal")}
        picksRemaining={1}
        consumableSlotsFull
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const picks = screen.getAllByRole("button", { name: /^Pick / });
    for (const btn of picks) expect(btn).toBeDisabled();
  });

  test("non-targeting Pick buttons stay enabled when consumable slots are full", () => {
    render(
      <PackOpenModal
        pack={spectralPack("normal", 2)}
        picksRemaining={1}
        consumableSlotsFull
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const picks = screen.getAllByRole("button", { name: /^Pick / });
    for (const btn of picks) expect(btn).not.toBeDisabled();
  });

  test("Pick buttons stay enabled in a Spectral pack when only joker slots are full", () => {
    render(
      <PackOpenModal
        pack={spectralPack("normal", 2)}
        picksRemaining={1}
        jokerSlotsFull
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const picks = screen.getAllByRole("button", { name: /^Pick / });
    for (const btn of picks) expect(btn).not.toBeDisabled();
  });

  test("clicking Pick on a spectral invokes onPick with the option index", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <PackOpenModal
        pack={spectralPack("normal", 2)}
        picksRemaining={1}
        onPick={onPick}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(onPick).toHaveBeenCalledWith(0);
  });
});

function cryptidPack(): PackOffer {
  const cryptid = SPECTRALS.find((s) => s.id === "cryptid");
  if (!cryptid) throw new Error("missing cryptid spectral in catalog");
  return {
    pool: "spectral",
    variant: "normal",
    options: [{ kind: "spectral" as const, spectral: cryptid }],
  };
}

const PREVIEW_HAND_FOR_CRYPTID = [
  { id: 4001, rank: "A" as const, suit: "spades" as const },
  { id: 4002, rank: "K" as const, suit: "hearts" as const },
];

describe("PackOpenModal — Cryptid Pick gating", () => {
  test("Cryptid Pick is disabled when no preview card is selected (negative)", () => {
    render(
      <PackOpenModal
        pack={cryptidPack()}
        picksRemaining={1}
        previewHand={PREVIEW_HAND_FOR_CRYPTID}
        previewSelectedIds={new Set()}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /^Pick Cryptid$/ })).toBeDisabled();
  });

  test("Cryptid Pick is enabled when exactly 1 preview card is selected", () => {
    render(
      <PackOpenModal
        pack={cryptidPack()}
        picksRemaining={1}
        previewHand={PREVIEW_HAND_FOR_CRYPTID}
        previewSelectedIds={new Set([PREVIEW_HAND_FOR_CRYPTID[0].id])}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /^Pick Cryptid$/ })).not.toBeDisabled();
  });

  test("Cryptid Pick stays enabled when the consumable tray is full (no longer gated by slot)", () => {
    render(
      <PackOpenModal
        pack={cryptidPack()}
        picksRemaining={1}
        previewHand={PREVIEW_HAND_FOR_CRYPTID}
        previewSelectedIds={new Set([PREVIEW_HAND_FOR_CRYPTID[0].id])}
        consumableSlotsFull
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /^Pick Cryptid$/ })).not.toBeDisabled();
  });

  test("Cryptid Pick is disabled with a selection-required tooltip when no preview card is selected", () => {
    render(
      <PackOpenModal
        pack={cryptidPack()}
        picksRemaining={1}
        previewHand={PREVIEW_HAND_FOR_CRYPTID}
        previewSelectedIds={new Set()}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /^Pick Cryptid$/ }),
    ).toHaveAttribute("title", "Select 1 card in the preview hand first");
  });
});

function standardPack(
  variant: "normal" | "jumbo" | "mega",
  cards: ReadonlyArray<Card>,
): PackOffer {
  return {
    pool: "standard",
    variant,
    options: cards.map((card) => ({ kind: "playing-card" as const, card })),
  };
}

describe("PackOpenModal — Standard pack rendering", () => {
  test("renders the Standard pack display name", () => {
    render(
      <PackOpenModal
        pack={standardPack("normal", [
          { id: 9001, rank: "A", suit: "spades" },
        ])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Standard Pack/ }),
    ).toBeInTheDocument();
  });

  test("Pick button label includes the playing-card's rank-suit name", () => {
    render(
      <PackOpenModal
        pack={standardPack("normal", [
          { id: 9002, rank: "K", suit: "hearts" },
        ])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Pick K/ }),
    ).toBeInTheDocument();
  });

  test("playing-card options stay enabled even when consumable or joker slots are full", () => {
    render(
      <PackOpenModal
        pack={standardPack("normal", [
          { id: 9003, rank: "2", suit: "hearts" },
        ])}
        picksRemaining={1}
        consumableSlotsFull
        jokerSlotsFull
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const pick = screen.getByRole("button", { name: /^Pick / });
    expect(pick).not.toBeDisabled();
  });

  test("clicking Pick on a playing-card invokes onPick with the option index", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <PackOpenModal
        pack={standardPack("mega", [
          { id: 9004, rank: "A", suit: "spades" },
          { id: 9005, rank: "K", suit: "hearts" },
        ])}
        picksRemaining={2}
        onPick={onPick}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId("pack-open-pick-1"));
    expect(onPick).toHaveBeenCalledWith(1);
  });

  test("playing-card option shows an enhancement badge when present", () => {
    render(
      <PackOpenModal
        pack={standardPack("normal", [
          { id: 9006, rank: "A", suit: "spades", enhancement: "lucky" },
        ])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("pack-card-enhancement-0")).toHaveTextContent(
      "Lucky",
    );
  });

  test("playing-card option shows a seal badge when present", () => {
    render(
      <PackOpenModal
        pack={standardPack("normal", [
          { id: 9007, rank: "K", suit: "hearts", seal: "red" },
        ])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("pack-card-seal-0")).toHaveTextContent("Red Seal");
  });

  test("playing-card option shows an edition badge when present", () => {
    render(
      <PackOpenModal
        pack={standardPack("normal", [
          { id: 9009, rank: "Q", suit: "clubs", edition: "polychrome" },
        ])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("pack-card-edition-0")).toHaveTextContent(
      "Polychrome",
    );
  });

  test("the Pick action announces the card modifiers", () => {
    render(
      <PackOpenModal
        pack={standardPack("normal", [
          { id: 9010, rank: "A", suit: "spades", enhancement: "steel", seal: "red" },
        ])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const pick = screen.getByTestId("pack-open-pick-0");
    expect(pick.getAttribute("aria-label")).toMatch(/Steel.*Red Seal/);
  });

  test("a plain playing-card option renders no modifier badges (negative)", () => {
    render(
      <PackOpenModal
        pack={standardPack("normal", [
          { id: 9011, rank: "2", suit: "clubs" },
        ])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("pack-card-enhancement-0"),
    ).not.toBeInTheDocument();
  });
});

describe("PackOpenModal — Arcana preview hand and selection", () => {
  const previewCards = [
    { id: 1001, rank: "A" as const, suit: "spades" as const },
    { id: 1002, rank: "K" as const, suit: "hearts" as const },
    { id: 1003, rank: "Q" as const, suit: "diamonds" as const },
  ];

  test("renders the preview hand when previewHand is provided", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={previewCards}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("pack-open-preview-hand")).toBeInTheDocument();
  });

  test("does not render preview hand when previewHand is empty", () => {
    render(
      <PackOpenModal
        pack={celestialPack("normal", 3)}
        picksRemaining={1}
        previewHand={[]}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("pack-open-preview-hand")).not.toBeInTheDocument();
  });

  test("preview cards are clickable as long as onSelectPreviewCard is provided", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={previewCards}
        previewSelectedIds={new Set()}
        onSelectPreviewCard={onSelect}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /^A of / }));
    expect(onSelect).toHaveBeenCalledWith(1001);
  });

  test("subtitle reflects preview selection count when cards are selected", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={previewCards}
        previewSelectedIds={new Set([1001, 1002])}
        onSelectPreviewCard={vi.fn()}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("pack-open-subtitle")).toHaveTextContent(
      /2 preview cards selected — pick a tarot to apply/,
    );
  });

  test("tarot Pick button is disabled when no preview card is selected", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={previewCards}
        previewSelectedIds={new Set()}
        onSelectPreviewCard={vi.fn()}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const picks = screen.getAllByRole("button", { name: /^Pick / });
    for (const btn of picks) expect(btn).toBeDisabled();
  });

  test("tarot Pick button enables once at least one preview card is selected", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={previewCards}
        previewSelectedIds={new Set([1001])}
        onSelectPreviewCard={vi.fn()}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getAllByRole("button", { name: /^Pick / }).every((b) => !(b as HTMLButtonElement).disabled),
    ).toBe(true);
  });

  test("tarot Pick button disables when too many preview cards are selected", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={[
          ...previewCards,
          { id: 1004, rank: "J" as const, suit: "clubs" as const },
        ]}
        previewSelectedIds={new Set([1001, 1002, 1003])}
        onSelectPreviewCard={vi.fn()}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const picks = screen.getAllByRole("button", { name: /^Pick / });
    for (const btn of picks) expect(btn).toBeDisabled();
  });

  test("clicking a tarot Pick after selecting a card invokes onPick", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={previewCards}
        previewSelectedIds={new Set([1001])}
        onSelectPreviewCard={vi.fn()}
        onPick={onPick}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getAllByRole("button", { name: /^Pick / })[0]);
    expect(onPick).toHaveBeenCalledWith(0);
  });
});

describe("PackOpenModal — preview-hand sort toolbar", () => {
  const mixedPreview = [
    { id: 2001, rank: "5" as const, suit: "hearts" as const },
    { id: 2002, rank: "K" as const, suit: "spades" as const },
    { id: 2003, rank: "2" as const, suit: "clubs" as const },
    { id: 2004, rank: "A" as const, suit: "diamonds" as const },
  ];

  function cardAriaLabels(): string[] {
    return screen
      .getAllByRole("button", { name: /^[A-Z0-9]+ of / })
      .map((btn) => btn.getAttribute("aria-label") ?? "");
  }

  test("renders Rank and Suit sort buttons when previewHand is non-empty", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={mixedPreview}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("pack-open-preview-sort-rank")).toBeInTheDocument();
    expect(screen.getByTestId("pack-open-preview-sort-suit")).toBeInTheDocument();
  });

  test("does not render sort buttons when preview hand is empty", () => {
    render(
      <PackOpenModal
        pack={celestialPack("normal", 3)}
        picksRemaining={1}
        previewHand={[]}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("pack-open-preview-sort-rank")).not.toBeInTheDocument();
  });

  test("Rank button is the default active sort", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={mixedPreview}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("pack-open-preview-sort-rank")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("default rank sort places the Ace first", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={mixedPreview}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(cardAriaLabels()[0]).toMatch(/^A of /);
  });

  test("clicking Suit flips aria-pressed onto the Suit button", async () => {
    const user = userEvent.setup();
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={mixedPreview}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId("pack-open-preview-sort-suit"));
    expect(screen.getByTestId("pack-open-preview-sort-suit")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("clicking Suit reorders the preview hand", async () => {
    const user = userEvent.setup();
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={mixedPreview}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const beforeOrder = cardAriaLabels().join("|");
    await user.click(screen.getByTestId("pack-open-preview-sort-suit"));
    const afterOrder = cardAriaLabels().join("|");
    expect(afterOrder).not.toBe(beforeOrder);
  });

  test("sorting does not change which underlying card id is passed to onSelectPreviewCard", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={mixedPreview}
        previewSelectedIds={new Set()}
        onSelectPreviewCard={onSelect}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId("pack-open-preview-sort-suit"));
    await user.click(screen.getByRole("button", { name: /^A of / }));
    expect(onSelect).toHaveBeenCalledWith(2004);
  });
});

describe("PackOpenModal — preview-hand reorder", () => {
  const reorderPreview = [
    { id: 3001, rank: "5" as const, suit: "hearts" as const },
    { id: 3002, rank: "K" as const, suit: "spades" as const },
    { id: 3003, rank: "2" as const, suit: "clubs" as const },
  ];

  function previewCardTestIds(): string[] {
    return Array.from(
      screen.getByTestId("pack-open-preview-hand").querySelectorAll(
        "[data-testid^='pack-open-preview-card-']",
      ),
    ).map((el) => el.getAttribute("data-testid") ?? "");
  }

  function dispatchDragSequence(sourceId: number, targetId: number): void {
    const source = screen.getByTestId(`pack-open-preview-card-${sourceId}`);
    const target = screen.getByTestId(`pack-open-preview-card-${targetId}`);
    const data: Record<string, string> = {};
    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      setData: (k: string, v: string) => {
        data[k] = v;
      },
      getData: (k: string) => data[k] ?? "",
    };
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
    fireEvent.dragEnd(source, { dataTransfer });
  }

  test("preview cards each render a draggable wrapper with a stable testid", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={reorderPreview}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(previewCardTestIds()).toHaveLength(3);
  });

  test("dragging a card onto another card reorders the preview hand", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={reorderPreview}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const before = previewCardTestIds();
    dispatchDragSequence(3003, 3001);
    const after = previewCardTestIds();
    expect(after).not.toEqual(before);
  });

  test("manual reorder places the dragged card before the drop target", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={reorderPreview}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    dispatchDragSequence(3002, 3003);
    const ids = previewCardTestIds().map((tid) =>
      Number(tid.replace("pack-open-preview-card-", "")),
    );
    expect(ids.indexOf(3002)).toBeLessThan(ids.indexOf(3003));
  });

  test("manual reorder calls onReorderPreview with the new id order", () => {
    const onReorder = vi.fn();
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={reorderPreview}
        onReorderPreview={onReorder}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    dispatchDragSequence(3002, 3003);
    expect(onReorder).toHaveBeenLastCalledWith(
      expect.arrayContaining([3001, 3002, 3003]),
    );
  });

  test("clicking a Sort button after a manual reorder restores the sort order (sort wins)", async () => {
    const user = userEvent.setup();
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={reorderPreview}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    dispatchDragSequence(3003, 3001);
    const manualOrder = previewCardTestIds();
    await user.click(screen.getByTestId("pack-open-preview-sort-rank"));
    const sortedOrder = previewCardTestIds();
    expect(sortedOrder).not.toEqual(manualOrder);
  });

  test("dragging a card onto itself does not change the order (negative)", () => {
    render(
      <PackOpenModal
        pack={arcanaPack("normal", 3)}
        picksRemaining={1}
        previewHand={reorderPreview}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const before = previewCardTestIds();
    dispatchDragSequence(3001, 3001);
    expect(previewCardTestIds()).toEqual(before);
  });
});

describe("PackOpenModal — keyboard preview reorder", () => {
  // Rank sort is descending, so the display order is K♠ (3002),
  // 5♥ (3001), 2♣ (3003).
  const reorderPreview = [
    { id: 3001, rank: "5" as const, suit: "hearts" as const },
    { id: 3002, rank: "K" as const, suit: "spades" as const },
    { id: 3003, rank: "2" as const, suit: "clubs" as const },
  ];

  function renderModal(onReorder = vi.fn()) {
    render(
      <>
        <PackOpenModal
          pack={arcanaPack("normal", 3)}
          picksRemaining={1}
          previewHand={reorderPreview}
          onReorderPreview={onReorder}
          onPick={vi.fn()}
          onClose={vi.fn()}
        />
        <LiveAnnouncer />
      </>,
    );
    return onReorder;
  }

  function previewIds(): number[] {
    return Array.from(
      screen
        .getByTestId("pack-open-preview-hand")
        .querySelectorAll("[data-testid^='pack-open-preview-card-']"),
    ).map((el) =>
      Number(
        (el.getAttribute("data-testid") ?? "").replace(
          "pack-open-preview-card-",
          "",
        ),
      ),
    );
  }

  test("Move right shifts the card one position to the right", () => {
    const onReorder = renderModal();
    fireEvent.click(screen.getByTestId("pack-open-preview-move-right-3002"));
    expect(previewIds()).toEqual([3001, 3002, 3003]);
    expect(onReorder).toHaveBeenLastCalledWith([3001, 3002, 3003]);
  });

  test("Move left shifts the card one position to the left", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("pack-open-preview-move-left-3003"));
    expect(previewIds()).toEqual([3002, 3003, 3001]);
  });

  test("a keyboard move announces the card's new position", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("pack-open-preview-move-right-3002"));
    expect(screen.getByTestId("live-announcer")).toHaveTextContent(
      "K of Spades moved to position 2 of 3",
    );
  });

  test("Move left on the first card announces it is already first and keeps the order", () => {
    renderModal();
    const before = previewIds();
    fireEvent.click(screen.getByTestId("pack-open-preview-move-left-3002"));
    expect(previewIds()).toEqual(before);
    expect(screen.getByTestId("live-announcer")).toHaveTextContent(
      "K of Spades is already at the first position",
    );
  });

  test("Move right on the last card announces it is already last and keeps the order", () => {
    renderModal();
    const before = previewIds();
    fireEvent.click(screen.getByTestId("pack-open-preview-move-right-3003"));
    expect(previewIds()).toEqual(before);
    expect(screen.getByTestId("live-announcer")).toHaveTextContent(
      "2 of Clubs is already at the last position",
    );
  });

  test("mouse drag reordering still works after a keyboard move", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("pack-open-preview-move-right-3002"));
    const source = screen.getByTestId("pack-open-preview-card-3003");
    const target = screen.getByTestId("pack-open-preview-card-3001");
    const data: Record<string, string> = {};
    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      setData: (k: string, v: string) => {
        data[k] = v;
      },
      getData: (k: string) => data[k] ?? "",
    };
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
    fireEvent.dragEnd(source, { dataTransfer });
    expect(previewIds()).toEqual([3003, 3001, 3002]);
  });
});

describe("PackOpenModal — Buffoon pack sticker badges", () => {
  function stickeredJokerPack(stickers: ReadonlyArray<JokerSticker>): PackOffer {
    const base = JOKERS[0];
    const stamped: Joker = { ...base, stickers };
    return {
      pool: "buffoon",
      variant: "normal",
      options: [{ kind: "joker" as const, joker: stamped }],
    };
  }

  test("an Eternal joker option renders the Eternal badge inside the pack tile", () => {
    render(
      <PackOpenModal
        pack={stickeredJokerPack([{ kind: "eternal" }])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("joker-sticker-eternal")).toBeInTheDocument();
  });

  test("a Perishable joker option renders the countdown badge (P N/5)", () => {
    render(
      <PackOpenModal
        pack={stickeredJokerPack([{ kind: "perishable", roundsHeld: 0 }])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("joker-sticker-perishable")).toHaveTextContent(
      `P ${PERISHABLE_LIFE}/${PERISHABLE_LIFE}`,
    );
  });

  test("a Rental joker option renders the Rental badge", () => {
    render(
      <PackOpenModal
        pack={stickeredJokerPack([{ kind: "rental" }])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("joker-sticker-rental")).toBeInTheDocument();
  });

  test("a joker option with both Eternal and Rental renders both badges (composition)", () => {
    render(
      <PackOpenModal
        pack={stickeredJokerPack([{ kind: "eternal" }, { kind: "rental" }])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("joker-sticker-eternal")).toBeInTheDocument();
    expect(screen.getByTestId("joker-sticker-rental")).toBeInTheDocument();
  });

  test("a sticker-less joker option renders no badge list (negative)", () => {
    render(
      <PackOpenModal
        pack={stickeredJokerPack([])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByTestId(/^joker-sticker-/)).not.toBeInTheDocument();
  });

  test("Pick button's accessible name mentions attached stickers", () => {
    render(
      <PackOpenModal
        pack={stickeredJokerPack([{ kind: "eternal" }])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Pick .*Eternal/ }),
    ).toBeInTheDocument();
  });

  test("hovering the option tile shows the sticker description via title attribute", () => {
    render(
      <PackOpenModal
        pack={stickeredJokerPack([{ kind: "perishable", roundsHeld: 2 }])}
        picksRemaining={1}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const optionTile = screen
      .getByTestId("joker-sticker-perishable")
      .closest(".pack-open-option");
    expect(optionTile?.getAttribute("title")).toMatch(
      new RegExp(`${PERISHABLE_LIFE - 2} of ${PERISHABLE_LIFE} rounds`),
    );
  });
});

describe("PackOpenModal i18n", () => {
  afterEach(async () => {
    const { restoreEnglishLocale } = await import("../../i18n/i18n.test-helpers");
    await restoreEnglishLocale();
  });

  test("pick buttons render Koho under the haw locale", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(
      <PackOpenModal
        pack={celestialPack("normal", 3)}
        picksRemaining={1}
        onPick={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getAllByText("Koho")).toHaveLength(3);
  });

  test("the close button renders Pau under the haw locale after a pick was made", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(
      <PackOpenModal
        pack={celestialPack("mega", 5)}
        picksRemaining={1}
        onPick={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId("pack-open-close")).toHaveTextContent("Pau");
  });
});

describe("PackOpenModal — coach suggestion placement", () => {
  beforeEach(async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("en");
  });

  test("the Coach tip trigger sits in the action row, with no panel until clicked", async () => {
    renderModal();
    const trigger = await screen.findByTestId("coach-trigger");
    expect(trigger.closest(".pack-open-actions")).not.toBeNull();
    expect(screen.queryByTestId("coach-advice")).not.toBeInTheDocument();
  });

  test("clicking the Coach tip trigger reveals the panel in its host, outside the action row", async () => {
    renderModal();
    await userEvent.click(await screen.findByTestId("coach-trigger"));
    const panel = await screen.findByTestId("coach-advice");
    expect(panel.closest(".pack-suggestion")).not.toBeNull();
    expect(panel.closest(".pack-open-actions")).toBeNull();
  });
});

describe("PackOpenModal — The Fool copy target", () => {
  const foolPack: PackOffer = {
    pool: "arcana",
    variant: "normal",
    options: [
      { kind: "tarot", tarot: TAROTS.find((tarot) => tarot.id === "the-fool")! },
    ],
  };

  test("appends the copy-target hint to a Fool option", () => {
    renderModal({
      pack: foolPack,
      foolCopyTarget: "Will create Mercury (Planet)",
    });
    expect(
      screen.getByText(/Will create Mercury \(Planet\)/),
    ).toBeInTheDocument();
  });
});
