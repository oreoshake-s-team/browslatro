import { render, screen } from "@testing-library/react";
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

  test("Pick buttons disable when consumable slots are full", () => {
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
    for (const btn of picks) expect(btn).toBeDisabled();
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

  test("Pick buttons disable when consumable slots are full", () => {
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
    for (const btn of picks) expect(btn).toBeDisabled();
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
