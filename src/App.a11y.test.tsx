import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import App from "./App";

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
