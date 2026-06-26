import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import AdminModeController from "./AdminModeController";
import { usePreferences } from "./preferences";
import { play } from "./sounds";

const KONAMI: ReadonlyArray<string> = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

function enterKonami(target: Window | HTMLElement = window): void {
  for (const key of KONAMI) {
    fireEvent.keyDown(target, { key });
  }
}

describe("AdminModeController", () => {
  beforeEach(() => {
    usePreferences.setState({ adminMode: false });
    vi.clearAllMocks();
  });

  test("the Konami code enables admin mode", () => {
    render(<AdminModeController />);
    enterKonami();
    expect(usePreferences.getState().adminMode).toBe(true);
  });

  test("enabling shows an on toast", () => {
    render(<AdminModeController />);
    enterKonami();
    expect(screen.getByTestId("admin-toast")).toHaveTextContent("Admin mode on");
  });

  test("a second Konami entry disables admin mode", () => {
    render(<AdminModeController />);
    enterKonami();
    enterKonami();
    expect(usePreferences.getState().adminMode).toBe(false);
  });

  test("disabling shows an off toast", () => {
    usePreferences.setState({ adminMode: true });
    render(<AdminModeController />);
    enterKonami();
    expect(screen.getByTestId("admin-toast")).toHaveTextContent(
      "Admin mode off",
    );
  });

  test("plays a sound on toggle", () => {
    render(<AdminModeController />);
    enterKonami();
    expect(play).toHaveBeenCalled();
  });

  test("renders no toast before any toggle (negative)", () => {
    render(<AdminModeController />);
    expect(screen.queryByTestId("admin-toast")).toBeNull();
  });

  test("an incomplete sequence does not toggle (negative)", () => {
    render(<AdminModeController />);
    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(usePreferences.getState().adminMode).toBe(false);
  });

  test("ignores the sequence while typing in an input (negative)", () => {
    render(
      <>
        <input data-testid="field" />
        <AdminModeController />
      </>,
    );
    enterKonami(screen.getByTestId("field"));
    expect(usePreferences.getState().adminMode).toBe(false);
  });
});
