import { describe, expect, test, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { useAnchoredTooltip } from "./useAnchoredTooltip";

function Harness() {
  const tip = useAnchoredTooltip<string>();
  return (
    <div>
      <button
        data-testid="a"
        aria-describedby={tip.describedBy("a")}
        onMouseEnter={(e) => tip.open("a", e.currentTarget)}
        onMouseLeave={() => tip.close("a")}
      >
        A
      </button>
      <button
        data-testid="b"
        aria-describedby={tip.describedBy("b")}
        onMouseEnter={(e) => tip.open("b", e.currentTarget)}
        onMouseLeave={() => tip.close("b")}
      >
        B
      </button>
      {tip.openId && tip.anchorRect && (
        <div data-testid="tooltip" id={`${tip.idBase}-${tip.openId}`}></div>
      )}
    </div>
  );
}

describe("useAnchoredTooltip", () => {
  test("opens and closes tooltips with ids and anchor rects", () => {
    const utils = render(<Harness />);
    const a = utils.getByTestId("a");
    const b = utils.getByTestId("b");

    // JSDOM getBoundingClientRect defaults to zeros; it's fine for presence checks.
    fireEvent.mouseEnter(a);
    expect(utils.getByTestId("tooltip")).toBeInTheDocument();
    const describedA = a.getAttribute("aria-describedby");
    expect(describedA).toBeTruthy();

    // Switching to B should update the describedby and still show tooltip
    fireEvent.mouseEnter(b);
    const describedB = b.getAttribute("aria-describedby");
    expect(describedB).toBeTruthy();
    expect(utils.getByTestId("tooltip")).toBeInTheDocument();

    // Leaving B closes if close("b") is called via onMouseLeave
    fireEvent.mouseLeave(b);
    // Now nothing is open, tooltip should be gone
    expect(utils.queryByTestId("tooltip")).toBeNull();
  });
});
