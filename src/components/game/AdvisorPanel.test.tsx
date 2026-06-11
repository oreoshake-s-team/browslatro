import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Advice } from "../../ai/advisor/advice";
import type { AdvisorDeps } from "../../ai/advisor/useAdvisor";
import type { CandidateRanker } from "../../ai/policy";
import type { Card } from "../../cards/types";
import { useGame } from "../../store/game";
import AdvisorPanel from "./AdvisorPanel";
import { clearAdvisorAdviceCache } from "../../ai/advisor/useAdvisor";

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
  load: async () => {},
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
  clearAdvisorAdviceCache();
  window.localStorage.clear();
  window.localStorage.setItem("browslatro:advisor-verbosity", "full");
  useGame.getState().resetGame();
  useGame.getState().setDealt({ hand: pairHand(), remaining: [] });
});

describe("AdvisorPanel", () => {
  test("renders as a modal dialog labelled by its title", async () => {
    render(<AdvisorPanel onClose={vi.fn()} deps={makeDeps()} />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  test("defaults to just the move without a stored preference", async () => {
    window.localStorage.removeItem("browslatro:advisor-verbosity");
    render(<AdvisorPanel onClose={vi.fn()} deps={makeDeps()} />);
    expect(await screen.findByTestId("advisor-move-only")).toBeInTheDocument();
  });

  test("never calls the API without a stored preference", async () => {
    window.localStorage.removeItem("browslatro:advisor-verbosity");
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    render(
      <AdvisorPanel onClose={vi.fn()} deps={makeDeps({ fetchAdviceFn })} />,
    );
    await screen.findByTestId("advisor-move-only");
    expect(fetchAdviceFn).not.toHaveBeenCalled();
  });

  test("shows a download progress bar while the model loads", async () => {
    const ranker: CandidateRanker = {
      load: async (onProgress) => {
        onProgress?.({ loaded: 50, total: 200 });
        return new Promise<void>(() => {});
      },
      rank: passthroughRanker.rank,
    };
    render(<AdvisorPanel onClose={vi.fn()} deps={makeDeps({ ranker })} />);
    const bar = await screen.findByRole("progressbar");
    expect(bar).toHaveAttribute("value", "50");
  });

  test("shows the thinking status while the API call is in flight", async () => {
    const fetchAdviceFn = vi.fn().mockReturnValue(new Promise(() => {}));
    render(
      <AdvisorPanel onClose={vi.fn()} deps={makeDeps({ fetchAdviceFn })} />,
    );
    expect(await screen.findByText(/The coach is thinking/)).toBeInTheDocument();
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

  test("shows only the move when the stored verbosity is move", async () => {
    window.localStorage.setItem("browslatro:advisor-verbosity", "move");
    render(<AdvisorPanel onClose={vi.fn()} deps={makeDeps()} />);
    expect(await screen.findByTestId("advisor-move-only")).toBeInTheDocument();
  });

  test("never calls the API when the stored verbosity is move", async () => {
    window.localStorage.setItem("browslatro:advisor-verbosity", "move");
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    render(
      <AdvisorPanel onClose={vi.fn()} deps={makeDeps({ fetchAdviceFn })} />,
    );
    await screen.findByTestId("advisor-move-only");
    expect(fetchAdviceFn).not.toHaveBeenCalled();
  });

  test("switching to just-the-move persists the preference", async () => {
    const user = userEvent.setup();
    render(<AdvisorPanel onClose={vi.fn()} deps={makeDeps()} />);
    await screen.findByText("Play the pair of nines for guaranteed value.");
    await user.click(screen.getByRole("button", { name: "Just the move" }));
    expect(window.localStorage.getItem("browslatro:advisor-verbosity")).toBe(
      "move",
    );
  });

  test("switching to just-the-move swaps the coach output for the bare move", async () => {
    const user = userEvent.setup();
    render(<AdvisorPanel onClose={vi.fn()} deps={makeDeps()} />);
    await screen.findByText("Play the pair of nines for guaranteed value.");
    await user.click(screen.getByRole("button", { name: "Just the move" }));
    expect(await screen.findByTestId("advisor-move-only")).toBeInTheDocument();
  });

  test("switching back to the walkthrough fetches the explanation", async () => {
    window.localStorage.setItem("browslatro:advisor-verbosity", "move");
    const user = userEvent.setup();
    render(<AdvisorPanel onClose={vi.fn()} deps={makeDeps()} />);
    await screen.findByTestId("advisor-move-only");
    await user.click(
      screen.getByRole("button", { name: "Walk me through it" }),
    );
    expect(
      await screen.findByText("Play the pair of nines for guaranteed value."),
    ).toBeInTheDocument();
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
