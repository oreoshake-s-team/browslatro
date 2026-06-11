import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import JokerStickerBadges from "./JokerStickerBadges";
import {
  PERISHABLE_LIFE,
  createBusinessCardJoker,
  type Joker,
} from "../../items/jokers";

function withStickers(stickers: Joker["stickers"]): Joker {
  return { ...createBusinessCardJoker(), stickers };
}

describe("JokerStickerBadges", () => {
  test("renders nothing for a joker with no stickers", () => {
    const j = createBusinessCardJoker();
    render(<JokerStickerBadges joker={j} />);
    expect(screen.queryByTestId(`joker-stickers-${j.id}`)).not.toBeInTheDocument();
  });

  test("renders a badge per attached sticker", () => {
    const j = withStickers([{ kind: "eternal" }, { kind: "rental" }]);
    render(<JokerStickerBadges joker={j} />);
    const badges = screen
      .getByTestId(`joker-stickers-${j.id}`)
      .querySelectorAll("li");
    expect(badges).toHaveLength(2);
  });

  test("an eternal badge has an accessible name including 'Eternal'", () => {
    const j = withStickers([{ kind: "eternal" }]);
    render(<JokerStickerBadges joker={j} />);
    const badge = screen
      .getByTestId(`joker-stickers-${j.id}`)
      .querySelector("li");
    expect(badge?.getAttribute("aria-label")).toMatch(/Eternal/);
  });

  test("a perishable badge labels the remaining rounds", () => {
    const j = withStickers([{ kind: "perishable", roundsHeld: 2 }]);
    render(<JokerStickerBadges joker={j} />);
    const badge = screen
      .getByTestId(`joker-stickers-${j.id}`)
      .querySelector("li");
    expect(badge?.getAttribute("aria-label")).toMatch(
      new RegExp(`${PERISHABLE_LIFE - 2} of ${PERISHABLE_LIFE} rounds`),
    );
  });

  test("a perishable badge at or past its life threshold labels as debuffed (negative)", () => {
    const j = withStickers([
      { kind: "perishable", roundsHeld: PERISHABLE_LIFE + 3 },
    ]);
    render(<JokerStickerBadges joker={j} />);
    const badge = screen
      .getByTestId(`joker-stickers-${j.id}`)
      .querySelector("li");
    expect(badge?.getAttribute("aria-label")).toMatch(/debuffed/i);
  });

  test("a rental badge uses the rental class", () => {
    const j = withStickers([{ kind: "rental" }]);
    render(<JokerStickerBadges joker={j} />);
    const badge = screen
      .getByTestId(`joker-stickers-${j.id}`)
      .querySelector("li");
    expect(badge?.classList.contains("joker-sticker-badge-rental")).toBe(true);
  });

  test("badge letters reflect kind", () => {
    const j = withStickers([{ kind: "eternal" }]);
    render(<JokerStickerBadges joker={j} />);
    const badge = screen
      .getByTestId(`joker-stickers-${j.id}`)
      .querySelector("li");
    expect(badge?.textContent).toBe("E");
  });

  test("perishable badge renders the countdown text (e.g. 'P 3/5')", () => {
    const j = withStickers([{ kind: "perishable", roundsHeld: 2 }]);
    render(<JokerStickerBadges joker={j} />);
    const badge = screen
      .getByTestId(`joker-stickers-${j.id}`)
      .querySelector("li");
    expect(badge?.textContent).toBe(`P 3/${PERISHABLE_LIFE}`);
  });

  test("perishable badge at expiry renders 'P 0/5'", () => {
    const j = withStickers([
      { kind: "perishable", roundsHeld: PERISHABLE_LIFE },
    ]);
    render(<JokerStickerBadges joker={j} />);
    const badge = screen
      .getByTestId(`joker-stickers-${j.id}`)
      .querySelector("li");
    expect(badge?.textContent).toBe(`P 0/${PERISHABLE_LIFE}`);
  });

  test("perishable badge gets the debuffed class once it has expired", () => {
    const j = withStickers([
      { kind: "perishable", roundsHeld: PERISHABLE_LIFE },
    ]);
    render(<JokerStickerBadges joker={j} />);
    const badge = screen
      .getByTestId(`joker-stickers-${j.id}`)
      .querySelector("li");
    expect(badge?.classList.contains("joker-sticker-badge-debuffed")).toBe(
      true,
    );
  });

  test("a still-active perishable badge has no debuffed class (negative)", () => {
    const j = withStickers([
      { kind: "perishable", roundsHeld: PERISHABLE_LIFE - 1 },
    ]);
    render(<JokerStickerBadges joker={j} />);
    const badge = screen
      .getByTestId(`joker-stickers-${j.id}`)
      .querySelector("li");
    expect(badge?.classList.contains("joker-sticker-badge-debuffed")).toBe(
      false,
    );
  });
});
