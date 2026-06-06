import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PackOpenModal from "./PackOpenModal";
import type { PackOffer } from "../../items/packs";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog } from "../../items/tarots";
import { createJokerCatalog } from "../../items/jokers";
import { createSpectralCatalog } from "../../items/spectrals";

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

  test("an option at a picked index is removed from the list (#647)", () => {
    renderModal({
      pack: celestialPack("mega", 5),
      picksRemaining: 1,
      pickedIndices: new Set([0]),
    });
    expect(screen.queryByTestId("pack-open-pick-0")).not.toBeInTheDocument();
  });

  test("other indices still render when one index is picked (#647)", () => {
    renderModal({
      pack: celestialPack("mega", 5),
      picksRemaining: 1,
      pickedIndices: new Set([0]),
    });
    expect(screen.getByTestId("pack-open-pick-1")).toBeInTheDocument();
  });

  test("a remaining Pick button stays enabled after one index was picked (#647)", () => {
    renderModal({
      pack: celestialPack("mega", 5),
      picksRemaining: 1,
      pickedIndices: new Set([0]),
    });
    expect(screen.getByTestId("pack-open-pick-1")).not.toBeDisabled();
  });

  test("with no picked indices, every option still renders (regression #647)", () => {
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

describe("PackOpenModal — Cryptid Pick gating (closes #630)", () => {
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
  cards: ReadonlyArray<{
    id: number;
    rank: "A" | "K" | "2";
    suit: "spades" | "hearts";
    enhancement?: "mult" | "lucky";
    seal?: "red";
  }>,
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

  test("playing-card description includes the enhancement label when present", () => {
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
    expect(screen.getByText(/lucky/)).toBeInTheDocument();
  });

  test("playing-card description includes the seal label when present", () => {
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
    expect(screen.getByText(/red seal/)).toBeInTheDocument();
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

describe("PackOpenModal — preview-hand reorder (#763)", () => {
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
