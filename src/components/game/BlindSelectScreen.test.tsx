import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BlindSelectScreen from "./BlindSelectScreen";
import type { BossBlind } from "../../items/bosses";
import { BASE_CHIPS, BLIND_MULTIPLIERS } from "../../constants";

const TEST_BOSS: BossBlind = {
  id: "boss-default",
  name: "The Wall",
  description: "Extra large blind requirement.",
  scoreMultiplier: 2,
  anteMin: 1,
  effect: { kind: "none" },
};

function renderScreen(
  overrides: Partial<Parameters<typeof BlindSelectScreen>[0]> = {},
) {
  return render(
    <BlindSelectScreen
      ante={1}
      currentBlind={1}
      boss={TEST_BOSS}
      onPlay={vi.fn()}
      {...overrides}
    />,
  );
}

describe("BlindSelectScreen", () => {
  test("shows the current ante in the title", () => {
    renderScreen({ ante: 3 });
    expect(screen.getByRole("heading", { name: /Ante 3/ })).toBeInTheDocument();
  });

  test("renders a row for each of the three blinds", () => {
    renderScreen();
    expect(screen.getByTestId("blind-select-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("blind-select-row-2")).toBeInTheDocument();
    expect(screen.getByTestId("blind-select-row-3")).toBeInTheDocument();
  });

  test("Small Blind required score reflects BASE_CHIPS x BLIND_MULTIPLIERS[0] for the ante", () => {
    renderScreen({ ante: 1 });
    expect(screen.getByTestId("blind-select-required-1")).toHaveTextContent(
      String(BASE_CHIPS[0] * BLIND_MULTIPLIERS[0]),
    );
  });

  test("Big Blind required score reflects BASE_CHIPS x BLIND_MULTIPLIERS[1] for the ante", () => {
    renderScreen({ ante: 2 });
    expect(screen.getByTestId("blind-select-required-2")).toHaveTextContent(
      String(BASE_CHIPS[1] * BLIND_MULTIPLIERS[1]),
    );
  });

  test("Boss required score reflects BASE_CHIPS x boss.scoreMultiplier", () => {
    const boss: BossBlind = { ...TEST_BOSS, scoreMultiplier: 4 };
    renderScreen({ ante: 2, boss });
    expect(screen.getByTestId("blind-select-required-3")).toHaveTextContent(
      String(BASE_CHIPS[1] * 4),
    );
  });

  test("Small Blind payout is $3", () => {
    renderScreen();
    expect(screen.getByTestId("blind-select-payout-1")).toHaveTextContent("$3");
  });

  test("Big Blind payout is $4", () => {
    renderScreen();
    expect(screen.getByTestId("blind-select-payout-2")).toHaveTextContent("$4");
  });

  test("Boss Blind payout is $5", () => {
    renderScreen();
    expect(screen.getByTestId("blind-select-payout-3")).toHaveTextContent("$5");
  });

  test("Boss row shows the boss name and description", () => {
    renderScreen();
    expect(screen.getByText("The Wall")).toBeInTheDocument();
    expect(screen.getByTestId("blind-select-boss-description")).toHaveTextContent(
      "Extra large blind requirement.",
    );
  });

  test("the current row is marked with data-blind-state=current", () => {
    renderScreen({ currentBlind: 2 });
    expect(screen.getByTestId("blind-select-row-2")).toHaveAttribute(
      "data-blind-state",
      "current",
    );
  });

  test("earlier-in-ante rows are marked completed", () => {
    renderScreen({ currentBlind: 2 });
    expect(screen.getByTestId("blind-select-row-1")).toHaveAttribute(
      "data-blind-state",
      "completed",
    );
  });

  test("later-in-ante rows are marked upcoming", () => {
    renderScreen({ currentBlind: 2 });
    expect(screen.getByTestId("blind-select-row-3")).toHaveAttribute(
      "data-blind-state",
      "upcoming",
    );
  });

  test("Play button targets the current blind in its label", () => {
    renderScreen({ currentBlind: 2 });
    expect(screen.getByTestId("blind-select-play")).toHaveTextContent("Play Big Blind");
  });

  test("Play button targets the boss by name when current blind is the boss", () => {
    renderScreen({ currentBlind: 3 });
    expect(screen.getByTestId("blind-select-play")).toHaveTextContent("Play The Wall");
  });

  test("clicking Play invokes onPlay", async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    renderScreen({ onPlay });
    await user.click(screen.getByTestId("blind-select-play"));
    expect(onPlay).toHaveBeenCalled();
  });

  test("Skip button renders on Small Blind when onSkip is provided", () => {
    renderScreen({ currentBlind: 1, onSkip: vi.fn() });
    expect(screen.getByTestId("blind-select-skip")).toBeInTheDocument();
  });

  test("Skip button renders on Big Blind when onSkip is provided", () => {
    renderScreen({ currentBlind: 2, onSkip: vi.fn() });
    expect(screen.getByTestId("blind-select-skip")).toBeInTheDocument();
  });

  test("Skip button does NOT render on Boss Blind even when onSkip is provided", () => {
    renderScreen({ currentBlind: 3, onSkip: vi.fn() });
    expect(screen.queryByTestId("blind-select-skip")).not.toBeInTheDocument();
  });

  test("Skip button does not render when onSkip is omitted", () => {
    renderScreen({ currentBlind: 1 });
    expect(screen.queryByTestId("blind-select-skip")).not.toBeInTheDocument();
  });

  test("clicking Skip invokes onSkip", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    renderScreen({ currentBlind: 1, onSkip });
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(onSkip).toHaveBeenCalled();
  });

  test("tag list is not rendered when no tags are held", () => {
    renderScreen({ tags: [] });
    expect(screen.queryByTestId("blind-select-tags")).not.toBeInTheDocument();
  });

  test("renders one chip per held Investment tag", () => {
    renderScreen({ tags: ["investment", "investment"] });
    expect(screen.getAllByTestId(/^blind-select-tag-/)).toHaveLength(2);
  });

  test("Investment chip shows the canonical tag name", () => {
    renderScreen({ tags: ["investment"] });
    expect(screen.getByTestId("blind-select-tag-0")).toHaveTextContent(
      "Investment Tag",
    );
  });

  test("Investment chip describes the $25 boss-defeat payout", () => {
    renderScreen({ tags: ["investment"] });
    expect(screen.getByTestId("blind-select-tag-0")).toHaveTextContent("$25");
  });
});
