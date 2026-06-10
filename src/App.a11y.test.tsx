import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import App from "./App";
import { useGame } from "./store/game";

describe("App landmarks (#640)", () => {
  test("the game shell exposes a main landmark", () => {
    render(<App />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  test("the sidebar exposes a complementary landmark", () => {
    render(<App />);
    expect(
      screen.getByRole("complementary", { name: "Game status" }),
    ).toBeInTheDocument();
  });
});

describe("App heading hierarchy (#917)", () => {
  afterEach(() => {
    useGame.getState().setPendingRunSelect(true);
  });

  test("fresh boot exposes exactly one visually-hidden h1 naming the main menu", () => {
    useGame.getState().setPendingRunSelect(true);
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Browlatro — Main menu" }),
    ).toHaveClass("sr-only");
  });

  test("the h1 switches to run-in-progress once a run starts", () => {
    useGame.getState().setPendingRunSelect(false);
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Browlatro — Run in progress",
    );
  });

  test("the gameplay surface starts at h1 and never skips a heading level", () => {
    useGame.getState().setPendingRunSelect(false);
    render(<App />);
    const levels = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
    ).map((el) => Number(el.tagName.slice(1)));
    const skips = levels.filter(
      (level, i) => i > 0 && level > (levels[i - 1] ?? 0) + 1,
    );
    expect(levels[0]).toBe(1);
    expect(skips).toEqual([]);
  });
});

describe("Game action buttons — emojis are decorative (#640)", () => {
  test("Submit Hand accessible name excludes the leading playing-card emoji", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: "Submit Hand" }),
    ).toBeInTheDocument();
  });

  test("Discard accessible name excludes the leading trash-can emoji", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: "Discard" }),
    ).toBeInTheDocument();
  });
});

describe("Modal dialogs inert the app shell (#907)", () => {
  test("the app shell is inert while the boot dialog is open", () => {
    const { container } = render(<App />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(container.querySelector("[data-app-shell]")).toHaveAttribute(
      "inert",
    );
  });
});
