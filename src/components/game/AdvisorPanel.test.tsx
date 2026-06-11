import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Advice } from "../../ai/advisor/advice";
import type { AdvisorDeps } from "../../ai/advisor/useAdvisor";
import type { CandidateRanker } from "../../ai/policy";
import type { Card } from "../../cards/types";
import { useGame } from "../../store/game";
import AdvisorPanel from "./AdvisorPanel";

function pairHand(): Card[] {
  return [
    { id: 1, rank: "9", suit: "hearts" },
    { id: 2, rank: "9", suit: "spades" },
    { id: 3, rank: "K", suit: "clubs" },
    { id: 4, rank: "4", suit: "diamonds" },
    { id: 5, rank: "7", suit: "hearts" },
  ];
}

function adviceFixture(): Advice {
  return {
    recommendationIndex: 0,
    alternativeIndex: 1,
    whyAlternativeWorse: "Discarding wastes a strong pair.",
    explanation: "Play the pair of nines for guaranteed value.",
    concept: "Bank guaranteed score before chasing draws.",
  };
}

const passthroughRanker: CandidateRanker = {
  rank: async (_state, candidates) => candidates.map((_, index) => index),
};

function makeDeps(extra?: Partial<AdvisorDeps>): AdvisorDeps {
  return {
    ranker: passthroughRanker,
    fetchAdviceFn: vi.fn().mockResolvedValue({ ok: true, advice: adviceFixture() }),
    getState: () => useGame.getState(),
    ...extra,
  };
}

beforeEach(() => {
  useGame.getState().resetGame();
  useGame.getState().setDealt({ hand: pairHand(), remaining: [] });
});

describe("AdvisorPanel", () => {
  test("renders as a modal dialog labelled by its title", async () => {
    render(<AdvisorPanel onClose={vi.fn()} deps={makeDeps()} />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  test("shows the thinking status while the request is in flight", () => {
    const fetchAdviceFn = vi.fn().mockReturnValue(new Promise(() => {}));
    render(
      <AdvisorPanel onClose={vi.fn()} deps={makeDeps({ fetchAdviceFn })} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "The coach is thinking",
    );
  });

  test("shows the coach's explanation when advice arrives", async () => {
    render(<AdvisorPanel onClose={vi.fn()} deps={makeDeps()} />);
    expect(
      await screen.findByText("Play the pair of nines for guaranteed value."),
    ).toBeInTheDocument();
  });

  test("shows the tempting alternative's tradeoff", async () => {
    render(<AdvisorPanel onClose={vi.fn()} deps={makeDeps()} />);
    expect(
      await screen.findByText("Discarding wastes a strong pair."),
    ).toBeInTheDocument();
  });

  test("shows the transferable concept", async () => {
    render(<AdvisorPanel onClose={vi.fn()} deps={makeDeps()} />);
    expect(
      await screen.findByText("Bank guaranteed score before chasing draws."),
    ).toBeInTheDocument();
  });

  test("falls back to the engine suggestion when the fetch fails", async () => {
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "not_configured" });
    render(
      <AdvisorPanel onClose={vi.fn()} deps={makeDeps({ fetchAdviceFn })} />,
    );
    expect(await screen.findByTestId("advisor-degraded")).toHaveTextContent(
      "explanation is unavailable",
    );
  });

  test("closes via the close button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AdvisorPanel onClose={onClose} deps={makeDeps()} />);
    await screen.findByText("Play the pair of nines for guaranteed value.");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes on Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AdvisorPanel onClose={onClose} deps={makeDeps()} />);
    await screen.findByText("Play the pair of nines for guaranteed value.");
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
