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

describe("Modal dialogs inert the app shell (#907)", () => {
  test("the app shell is inert while the boot dialog is open", () => {
    const { container } = render(<App />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(container.querySelector("[data-app-shell]")).toHaveAttribute(
      "inert",
    );
  });
});

describe("Live announcer (#908)", () => {
  test("the app mounts a polite live region for announcements", () => {
    render(<App />);
    expect(screen.getByTestId("live-announcer")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });
});
