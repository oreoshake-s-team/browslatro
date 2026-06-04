import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import HandScore from "./HandScore";
import { HANDS } from "../../constants";

describe("HandScore empty state", () => {
  test("does not render a hand label when selectedHand is null", () => {
    render(<HandScore chips={0} multiplier={0} selectedHand={null} />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  test("renders chips as 0 when empty", () => {
    const { container } = render(
      <HandScore chips={0} multiplier={0} selectedHand={null} />,
    );
    expect(container.querySelector(".chips")).toHaveTextContent("0");
  });

  test("renders multiplier as 0 when empty", () => {
    const { container } = render(
      <HandScore chips={0} multiplier={0} selectedHand={null} />,
    );
    expect(container.querySelector(".multiplier")).toHaveTextContent("0");
  });
});

describe("HandScore populated state", () => {
  test("renders the hand label when selectedHand is provided", () => {
    render(
      <HandScore chips={20} multiplier={2} selectedHand={HANDS[2]} />,
    );
    expect(
      screen.getByRole("heading", { name: HANDS[2].label }),
    ).toBeInTheDocument();
  });

  test("renders the live chips value when selectedHand is provided", () => {
    const { container } = render(
      <HandScore chips={42} multiplier={2} selectedHand={HANDS[0]} />,
    );
    expect(container.querySelector(".chips")).toHaveTextContent("42");
  });

  test("renders the live multiplier value when selectedHand is provided", () => {
    const { container } = render(
      <HandScore chips={10} multiplier={7} selectedHand={HANDS[0]} />,
    );
    expect(container.querySelector(".multiplier")).toHaveTextContent("7");
  });
});

describe("HandScore level chip (#241)", () => {
  test("renders the level chip when selectedHandLevel is provided", () => {
    render(
      <HandScore
        chips={10}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={2}
      />,
    );
    expect(screen.getByText("Lv 2")).toBeInTheDocument();
  });

  test("reflects the current level number passed in (not stale)", () => {
    const { rerender } = render(
      <HandScore
        chips={10}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={1}
      />,
    );
    rerender(
      <HandScore
        chips={10}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={3}
      />,
    );
    expect(screen.getByText("Lv 3")).toBeInTheDocument();
  });

  test("does not render a level chip when selectedHandLevel is omitted", () => {
    render(<HandScore chips={10} multiplier={2} selectedHand={HANDS[1]} />);
    expect(screen.queryByText(/Lv\s/)).not.toBeInTheDocument();
  });

  test("does not render a level chip when no hand is selected", () => {
    render(
      <HandScore
        chips={0}
        multiplier={0}
        selectedHand={null}
        selectedHandLevel={5}
      />,
    );
    expect(screen.queryByText(/Lv\s/)).not.toBeInTheDocument();
  });

  test("exposes the level via the heading's accessible name", () => {
    render(
      <HandScore
        chips={10}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={4}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Pair, level 4" }),
    ).toBeInTheDocument();
  });

  test("omits the level from the heading's accessible name when no level is provided", () => {
    render(<HandScore chips={10} multiplier={2} selectedHand={HANDS[1]} />);
    expect(
      screen.getByRole("heading", { name: "Pair" }),
    ).toBeInTheDocument();
  });
});

describe("HandScore level-up animation (#601)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let raf = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      raf += 1;
      window.setTimeout(() => cb(performance.now()), 16);
      return raf;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      window.clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test("highlights chips when the hand level bumps for the same selected hand", () => {
    const { rerender, container } = render(
      <HandScore
        chips={10}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={1}
      />,
    );
    rerender(
      <HandScore
        chips={25}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={2}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(container.querySelector(".chips")).toHaveAttribute(
      "data-leveling",
      "true",
    );
  });

  test("highlights multiplier when the hand level bumps for the same selected hand", () => {
    const { rerender, container } = render(
      <HandScore
        chips={10}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={1}
      />,
    );
    rerender(
      <HandScore
        chips={10}
        multiplier={5}
        selectedHand={HANDS[1]}
        selectedHandLevel={2}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(container.querySelector(".multiplier")).toHaveAttribute(
      "data-leveling",
      "true",
    );
  });

  test("does not highlight when a different hand is selected (negative)", () => {
    const { rerender, container } = render(
      <HandScore
        chips={10}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={1}
      />,
    );
    rerender(
      <HandScore
        chips={20}
        multiplier={3}
        selectedHand={HANDS[2]}
        selectedHandLevel={1}
      />,
    );
    expect(container.querySelector(".chips")).not.toHaveAttribute(
      "data-leveling",
    );
  });

  test("does not highlight when chips change without a level bump (e.g. dev modifier, negative)", () => {
    const { rerender, container } = render(
      <HandScore
        chips={10}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={1}
      />,
    );
    rerender(
      <HandScore
        chips={25}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={1}
      />,
    );
    expect(container.querySelector(".chips")).not.toHaveAttribute(
      "data-leveling",
    );
  });

  test("clears the leveling class after the animation finishes", () => {
    const { rerender, container } = render(
      <HandScore
        chips={10}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={1}
      />,
    );
    rerender(
      <HandScore
        chips={25}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={2}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.querySelector(".chips")).not.toHaveAttribute(
      "data-leveling",
    );
  });

  test("eventually reaches the new chips target after animating", () => {
    const { rerender, container } = render(
      <HandScore
        chips={10}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={1}
      />,
    );
    rerender(
      <HandScore
        chips={40}
        multiplier={2}
        selectedHand={HANDS[1]}
        selectedHandLevel={2}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.querySelector(".chips")).toHaveTextContent("40");
  });
});
