import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  castleDescriptionNode,
  castleDescriptionText,
} from "./castleDescription";

describe("castleDescriptionText", () => {
  test("appends the current suit glyph and name when a suit is set", () => {
    expect(castleDescriptionText("Base", "hearts", "Hearts")).toBe(
      "Base — Currently: ♥ Hearts",
    );
  });

  test("shows the descriptive placeholder when no suit is set", () => {
    expect(castleDescriptionText("Base", null, null)).toBe(
      "Base — Suit is chosen when the blind starts",
    );
  });
});

describe("castleDescriptionNode", () => {
  test("renders the suit name inside its suit-colored element", () => {
    const { container } = render(
      <>{castleDescriptionNode("Base", "clubs", "Clubs")}</>,
    );
    expect(container.querySelector(".castle-suit-clubs")?.textContent).toBe(
      "♣ Clubs",
    );
  });

  test("shows the descriptive placeholder when no suit is set", () => {
    const { container } = render(
      <>{castleDescriptionNode("Base", null, null)}</>,
    );
    expect(container.textContent).toBe(
      "Base — Suit is chosen when the blind starts",
    );
  });
});
