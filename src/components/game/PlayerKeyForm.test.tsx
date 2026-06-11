import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { readStoredPlayerKey } from "../../ai/advisor/playerKey";
import PlayerKeyForm from "./PlayerKeyForm";

beforeEach(() => {
  window.localStorage.clear();
});

describe("PlayerKeyForm", () => {
  test("stores the entered key on submit", async () => {
    const user = userEvent.setup();
    render(<PlayerKeyForm onSaved={vi.fn()} />);
    await user.type(screen.getByTestId("player-key-input"), "sk-ant-abc123");
    await user.click(screen.getByRole("button", { name: /Save key/ }));
    expect(readStoredPlayerKey()).toBe("sk-ant-abc123");
  });

  test("calls onSaved after a successful save", async () => {
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<PlayerKeyForm onSaved={onSaved} />);
    await user.type(screen.getByTestId("player-key-input"), "sk-ant-xyz");
    await user.click(screen.getByRole("button", { name: /Save key/ }));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  test("disables save while the field is empty", () => {
    render(<PlayerKeyForm onSaved={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Save key/ })).toBeDisabled();
  });

  test("does not store anything when submitted empty", async () => {
    const onSaved = vi.fn();
    render(<PlayerKeyForm onSaved={onSaved} />);
    expect(readStoredPlayerKey()).toBeNull();
  });

  test("links out to the Anthropic key page", () => {
    render(<PlayerKeyForm onSaved={vi.fn()} />);
    expect(screen.getByRole("link", { name: /Get an API key/ })).toHaveAttribute(
      "href",
      "https://console.anthropic.com/settings/keys",
    );
  });
});
