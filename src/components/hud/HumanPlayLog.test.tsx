import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import HumanPlayLog from "./HumanPlayLog";
import { humanPlayLog } from "../../ai/humanPlayWiring";
import { useGame } from "../../store/game";
import { usePreferences } from "../system/preferences";

async function openLog(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(screen.getByText("Human play log"));
}

describe("HumanPlayLog", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useGame.getState().resetGame();
  });

  function seedOneRecord(): void {
    window.localStorage.setItem("browslatro.human-play-log.v1", '{"schema":1}');
  }

  test("renders nothing when admin mode is off (negative)", () => {
    usePreferences.setState({ adminMode: false });
    const { container } = render(<HumanPlayLog />);
    expect(container).toBeEmptyDOMElement();
  });

  test("shows the recorded decision count", async () => {
    seedOneRecord();
    const user = userEvent.setup();
    render(<HumanPlayLog />);
    await openLog(user);
    expect(screen.getByTestId("human-play-log-count")).toHaveTextContent(
      "1 recorded decision",
    );
  });

  test("disables export when the log is empty", async () => {
    const user = userEvent.setup();
    render(<HumanPlayLog />);
    await openLog(user);
    expect(screen.getByRole("button", { name: /Export log/ })).toBeDisabled();
  });

  test("disables clear when the log is empty", async () => {
    const user = userEvent.setup();
    render(<HumanPlayLog />);
    await openLog(user);
    expect(screen.getByRole("button", { name: /Clear log/ })).toBeDisabled();
  });

  test("clear empties the log", async () => {
    seedOneRecord();
    const user = userEvent.setup();
    render(<HumanPlayLog />);
    await openLog(user);
    await user.click(screen.getByRole("button", { name: /Clear log/ }));
    expect(humanPlayLog().count()).toBe(0);
  });

  test("clear resets the visible count", async () => {
    seedOneRecord();
    const user = userEvent.setup();
    render(<HumanPlayLog />);
    await openLog(user);
    await user.click(screen.getByRole("button", { name: /Clear log/ }));
    expect(screen.getByTestId("human-play-log-count")).toHaveTextContent(
      "0 recorded decisions",
    );
  });

  test("export downloads the JSONL via an object URL", async () => {
    seedOneRecord();
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const user = userEvent.setup();
    render(<HumanPlayLog />);
    await openLog(user);
    await user.click(screen.getByRole("button", { name: /Export log/ }));
    vi.unstubAllGlobals();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });
});
