import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
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

  test("skip-reward preview renders on Small Blind from the small offer", () => {
    renderScreen({ skipRewards: { small: "investment", big: "investment" } });
    expect(
      screen.getByTestId("blind-select-row-skip-reward-1"),
    ).toBeInTheDocument();
  });

  test("skip-reward preview renders on Big Blind from the big offer", () => {
    renderScreen({ skipRewards: { small: "investment", big: "investment" } });
    expect(
      screen.getByTestId("blind-select-row-skip-reward-2"),
    ).toBeInTheDocument();
  });

  test("skip-reward preview does NOT render on Boss Blind even when offers are provided", () => {
    renderScreen({ skipRewards: { small: "investment", big: "investment" } });
    expect(
      screen.queryByTestId("blind-select-row-skip-reward-3"),
    ).not.toBeInTheDocument();
  });

  test("skip-reward preview does not render when no offers are provided", () => {
    renderScreen({});
    expect(
      screen.queryByTestId("blind-select-row-skip-reward-1"),
    ).not.toBeInTheDocument();
  });

  test("a blind without its own offer shows no skip reward (negative)", () => {
    renderScreen({ skipRewards: { small: "investment" } });
    expect(
      screen.queryByTestId("blind-select-row-skip-reward-2"),
    ).not.toBeInTheDocument();
  });

  test("the blind with an offer still shows its skip reward when the other is absent", () => {
    renderScreen({ skipRewards: { small: "investment" } });
    expect(
      screen.getByTestId("blind-select-row-skip-reward-1"),
    ).toBeInTheDocument();
  });

  test("skip-reward preview names the granted tag", () => {
    renderScreen({ skipRewards: { small: "investment", big: "investment" } });
    expect(
      screen.getByTestId("blind-select-row-skip-reward-1"),
    ).toHaveTextContent("Investment Tag");
  });

  test("skip-reward preview shows a tooltip with the tag's effect on hover", async () => {
    const user = userEvent.setup();
    renderScreen({ skipRewards: { small: "investment", big: "investment" } });
    await user.hover(screen.getByTestId("blind-select-row-skip-reward-1"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("$25");
  });

  test("skip-reward preview hides the tooltip when the pointer leaves", async () => {
    const user = userEvent.setup();
    renderScreen({ skipRewards: { small: "investment", big: "investment" } });
    const target = screen.getByTestId("blind-select-row-skip-reward-1");
    await user.hover(target);
    await user.unhover(target);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("skip-reward preview is keyboard-focusable for the tooltip", () => {
    renderScreen({ skipRewards: { small: "investment", big: "investment" } });
    const target = screen.getByTestId("blind-select-row-skip-reward-1");
    fireEvent.focus(target);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Investment Tag");
  });

  test("held tag shows a tooltip with its description on hover", async () => {
    const user = userEvent.setup();
    renderScreen({ tags: ["investment"] });
    await user.hover(screen.getByTestId("blind-select-tag-0"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Investment Tag");
  });

  test("boss override select renders when bossOptions + onSetBoss are provided", () => {
    const second: BossBlind = {
      ...TEST_BOSS,
      id: "the-needle",
      name: "The Needle",
    };
    renderScreen({
      currentBlind: 3,
      bossOptions: [TEST_BOSS, second],
      onSetBoss: vi.fn(),
    });
    expect(screen.getByTestId("blind-select-boss-override")).toBeInTheDocument();
  });

  test("boss override select does NOT render when onSetBoss is omitted", () => {
    renderScreen({ currentBlind: 3, bossOptions: [TEST_BOSS] });
    expect(
      screen.queryByTestId("blind-select-boss-override"),
    ).not.toBeInTheDocument();
  });

  test("boss override select lists one option per eligible boss", () => {
    const second: BossBlind = {
      ...TEST_BOSS,
      id: "the-needle",
      name: "The Needle",
    };
    renderScreen({
      currentBlind: 3,
      bossOptions: [TEST_BOSS, second],
      onSetBoss: vi.fn(),
    });
    expect(
      screen.getByTestId("blind-select-boss-override").querySelectorAll("option"),
    ).toHaveLength(2);
  });

  test("changing the boss override select calls onSetBoss with the chosen id", async () => {
    const user = userEvent.setup();
    const onSetBoss = vi.fn();
    const second: BossBlind = {
      ...TEST_BOSS,
      id: "the-needle",
      name: "The Needle",
    };
    renderScreen({
      currentBlind: 3,
      bossOptions: [TEST_BOSS, second],
      onSetBoss,
    });
    await user.selectOptions(
      screen.getByTestId("blind-select-boss-override"),
      "the-needle",
    );
    expect(onSetBoss).toHaveBeenCalledWith("the-needle");
  });

  test("Small Blind payout is $0 on Red Stake (#553)", () => {
    renderScreen({ stake: "red" });
    expect(screen.getByTestId("blind-select-payout-1")).toHaveTextContent("$0");
  });

  test("Big Blind payout is still $4 on Red Stake (negative)", () => {
    renderScreen({ stake: "red" });
    expect(screen.getByTestId("blind-select-payout-2")).toHaveTextContent("$4");
  });

  test("Boss Blind payout is still $5 on Red Stake (negative)", () => {
    renderScreen({ stake: "red" });
    expect(screen.getByTestId("blind-select-payout-3")).toHaveTextContent("$5");
  });

  test("Small Blind payout is still $3 on White Stake (negative)", () => {
    renderScreen({ stake: "white" });
    expect(screen.getByTestId("blind-select-payout-1")).toHaveTextContent("$3");
  });
});
