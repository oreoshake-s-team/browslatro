import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PackOpenModal from "./PackOpenModal";
import type { PackOffer } from "../../items/packs";
import { createPlanetCatalog } from "../../items/planets";

const PLANETS = createPlanetCatalog();

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
