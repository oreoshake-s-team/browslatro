import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import SpectralTooltip from "./SpectralTooltip";
import { createSpectralCatalog } from "../../items/spectrals";

describe("SpectralTooltip", () => {
  test("renders the spectral card name in the tooltip", () => {
    const spectrals = createSpectralCatalog();
    const soul = spectrals.find((s) => s.id === "soul");
    if (!soul) throw new Error("missing soul spectral");

    const anchorRect = new DOMRect(100, 100, 50, 30);
    render(
      <SpectralTooltip
        id="test-tooltip"
        card={soul}
        anchorRect={anchorRect}
      />,
    );

    expect(screen.getByRole("tooltip")).toHaveTextContent(soul.name);
  });

  test("renders the spectral card description in the tooltip", () => {
    const spectrals = createSpectralCatalog();
    const blackHole = spectrals.find((s) => s.id === "black-hole");
    if (!blackHole) throw new Error("missing black-hole spectral");

    const anchorRect = new DOMRect(100, 100, 50, 30);
    render(
      <SpectralTooltip
        id="test-tooltip"
        card={blackHole}
        anchorRect={anchorRect}
      />,
    );

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      blackHole.description,
    );
  });

  test("renders the tooltip with the correct id attribute", () => {
    const spectrals = createSpectralCatalog();
    const soul = spectrals.find((s) => s.id === "soul");
    if (!soul) throw new Error("missing soul spectral");

    const anchorRect = new DOMRect(100, 100, 50, 30);
    render(
      <SpectralTooltip
        id="custom-id-123"
        card={soul}
        anchorRect={anchorRect}
      />,
    );

    expect(screen.getByRole("tooltip")).toHaveAttribute("id", "custom-id-123");
  });

  test("positions the tooltip below the anchor element", () => {
    const spectrals = createSpectralCatalog();
    const soul = spectrals.find((s) => s.id === "soul");
    if (!soul) throw new Error("missing soul spectral");

    const anchorRect = new DOMRect(100, 50, 80, 30);
    render(
      <SpectralTooltip
        id="test-tooltip"
        card={soul}
        anchorRect={anchorRect}
      />,
    );

    const tooltip = screen.getByRole("tooltip");
    const style = tooltip.getAttribute("style");
    expect(style).toContain("top:");
    expect(style).toContain("left:");
  });

  test("renders the tooltip via portal in document.body", () => {
    const spectrals = createSpectralCatalog();
    const soul = spectrals.find((s) => s.id === "soul");
    if (!soul) throw new Error("missing soul spectral");

    const anchorRect = new DOMRect(100, 100, 50, 30);
    render(
      <SpectralTooltip
        id="test-tooltip"
        card={soul}
        anchorRect={anchorRect}
      />,
    );

    const tooltip = screen.getByRole("tooltip");
    expect(document.body.contains(tooltip)).toBe(true);
  });
});
