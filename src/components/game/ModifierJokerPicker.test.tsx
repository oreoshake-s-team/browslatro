import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import ModifierJokerPicker from "./ModifierJokerPicker";
import { useGame } from "../../store/game";
import {
  MAX_JOKERS,
  createJokerCatalog,
  createLegendaryJokerCatalog,
  type Joker,
} from "../../items/jokers";
import { sortByDisplayName } from "./displayNameSort";

const ALL = sortByDisplayName(
  [...createJokerCatalog(), ...createLegendaryJokerCatalog()],
  (j) => j.name,
);
const PAGE_SIZE = 12;
const TOTAL_PAGES = Math.ceil(ALL.length / PAGE_SIZE);

async function openPicker(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(screen.getByText(/Add a specific Joker/));
}

function tileFor(id: string): HTMLButtonElement {
  const el = document.querySelector<HTMLButtonElement>(
    `button[data-joker-id="${id}"]`,
  );
  if (!el) throw new Error(`no tile for ${id}`);
  return el;
}

function visibleTileIds(): string[] {
  return Array.from(document.querySelectorAll("button[data-joker-id]")).map(
    (el) => el.getAttribute("data-joker-id") ?? "",
  );
}

describe("ModifierJokerPicker", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("renders a paginated grid of PAGE_SIZE tiles on first page", async () => {
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    expect(visibleTileIds()).toHaveLength(PAGE_SIZE);
  });

  test("first page is sorted alphabetically by name ignoring a leading 'The ' — stable pin", async () => {
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    const expected = ALL.slice(0, PAGE_SIZE).map((j) => j.id);
    expect(visibleTileIds()).toEqual(expected);
  });

  test("a 'The …' joker sorts under its real name, not under T (negative)", async () => {
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    const duoIndex = ALL.findIndex((j) => j.name === "The Duo");
    const targetPage = Math.floor(duoIndex / PAGE_SIZE) + 1;
    for (let i = 1; i < targetPage; i += 1) {
      await user.click(screen.getByTestId("modifier-joker-picker-next"));
    }
    expect(visibleTileIds()[duoIndex % PAGE_SIZE]).toBe(ALL[duoIndex].id);
  });

  test("clicking Next advances to page 2 contents", async () => {
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    await user.click(screen.getByTestId("modifier-joker-picker-next"));
    const expected = ALL.slice(PAGE_SIZE, PAGE_SIZE * 2).map((j) => j.id);
    expect(visibleTileIds()).toEqual(expected);
  });

  test("Prev is disabled on page 1 (negative)", async () => {
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    expect(screen.getByTestId("modifier-joker-picker-prev")).toBeDisabled();
  });

  test("Next is disabled on the last page (negative)", async () => {
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    for (let i = 0; i < TOTAL_PAGES - 1; i += 1) {
      await user.click(screen.getByTestId("modifier-joker-picker-next"));
    }
    expect(screen.getByTestId("modifier-joker-picker-next")).toBeDisabled();
  });

  test("page label reflects current and total pages", async () => {
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    expect(
      screen.getByTestId("modifier-joker-picker-page-label"),
    ).toHaveTextContent(`Page 1 / ${TOTAL_PAGES}`);
  });

  test("clicking a tile appends a fresh copy of that joker to the jokers list", async () => {
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    const firstId = visibleTileIds()[0];
    await user.click(tileFor(firstId));
    const equipped = useGame.getState().jokers;
    expect(equipped).toHaveLength(1);
    expect(equipped[0].id).toBe(firstId);
  });

  test("page does not jump back to 1 after clicking a tile on page 2", async () => {
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    await user.click(screen.getByTestId("modifier-joker-picker-next"));
    const id = visibleTileIds()[0];
    await user.click(tileFor(id));
    expect(
      screen.getByTestId("modifier-joker-picker-page-label"),
    ).toHaveTextContent("Page 2 /");
  });

  test("when the joker capacity is full, every tile is disabled (aria-disabled)", async () => {
    const fillJokers: Joker[] = [];
    for (let i = 0; i < MAX_JOKERS; i += 1) fillJokers.push({ ...ALL[i] });
    useGame.getState().setJokers(fillJokers);
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    const tiles = document.querySelectorAll("button[data-joker-id]");
    expect(Array.from(tiles).every((t) => t.hasAttribute("disabled"))).toBe(
      true,
    );
  });

  test("clicking a tile while full is a no-op (negative)", async () => {
    const fillJokers: Joker[] = [];
    for (let i = 0; i < MAX_JOKERS; i += 1) fillJokers.push({ ...ALL[i] });
    useGame.getState().setJokers(fillJokers);
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    const before = useGame.getState().jokers.length;
    await user.click(tileFor(visibleTileIds()[0]));
    expect(useGame.getState().jokers).toHaveLength(before);
  });

  test("tooltip opens on focus and closes on blur", async () => {
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    const tile = tileFor(visibleTileIds()[0]);
    fireEvent.focus(tile);
    expect(document.querySelector(".joker-tooltip")).not.toBeNull();
    fireEvent.blur(tile);
    expect(document.querySelector(".joker-tooltip")).toBeNull();
  });

  test("reopening the disclosure resets to page 1", async () => {
    const user = userEvent.setup();
    render(<ModifierJokerPicker />);
    await openPicker(user);
    await user.click(screen.getByTestId("modifier-joker-picker-next"));
    expect(
      screen.getByTestId("modifier-joker-picker-page-label"),
    ).toHaveTextContent("Page 2 /");
    await user.click(screen.getByText(/Add a specific Joker/));
    await user.click(screen.getByText(/Add a specific Joker/));
    expect(
      screen.getByTestId("modifier-joker-picker-page-label"),
    ).toHaveTextContent("Page 1 /");
  });
});

describe("ModifierJokerPicker aria i18n", () => {
  afterEach(async () => {
    const { restoreEnglishLocale } = await import("../../i18n/i18n.test-helpers");
    await restoreEnglishLocale();
  });

  test("the pagination nav resolves its accessible name from the catalog", () => {
    render(<ModifierJokerPicker />);
    expect(
      screen.getByRole("navigation", { name: "Joker picker pagination" }),
    ).toBeInTheDocument();
  });

  test("the pagination nav keeps the English fallback under the haw locale (negative)", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(<ModifierJokerPicker />);
    expect(
      screen.getByRole("navigation", { name: "Joker picker pagination" }),
    ).toBeInTheDocument();
  });
});
