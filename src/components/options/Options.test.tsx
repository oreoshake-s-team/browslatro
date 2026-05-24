import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Options from "./Options";
import {
  isHighVisibility,
  isMuted,
  toggleHighVisibility,
  toggleMute,
} from "../system/preferences";

const STORAGE_KEY = "browslatro:highVisibility";
const MUTED_KEY = "browslatro:muted";

/**
 * The preferences module is a singleton, so any test that flips a
 * preference must reset it (and localStorage) afterwards to keep tests
 * independent. We reset via the public toggles so module state and
 * storage stay in sync.
 */
function resetPreferences(): void {
  if (isHighVisibility()) {
    toggleHighVisibility();
  }
  if (isMuted()) {
    toggleMute();
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(MUTED_KEY);
}

describe("Options", () => {
  afterEach(resetPreferences);

  test("button opens modal", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
    await user.click(screen.getByText("Options"));
    expect(screen.getByRole("heading", { name: "Options" })).toBeInTheDocument();
  });

  test("Close button dismisses modal", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("Close"));
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
  });

  test("clicking overlay dismisses modal", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.click(document.querySelector(".modal-overlay") as HTMLElement);
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
  });

  test("sound toggle changes label from mute to unmute", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(screen.getByText(/Mute sounds/)).toBeInTheDocument();
    await user.click(screen.getByText(/Mute sounds/));
    expect(screen.getByText(/Unmute sounds/)).toBeInTheDocument();
  });

  test("New game button calls onNewGame and closes modal", async () => {
    const user = userEvent.setup();
    const onNewGame = jest.fn();
    render(<Options onNewGame={onNewGame} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));
    expect(onNewGame).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
  });
});

describe("Options — high visibility toggle", () => {
  afterEach(resetPreferences);

  test("renders the high visibility toggle inside the modal", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(
      screen.getByRole("button", { name: /Enable high visibility suits/ })
    ).toBeInTheDocument();
  });

  test("does not show the toggle before the modal opens", () => {
    render(<Options onNewGame={() => {}} />);
    expect(
      screen.queryByRole("button", { name: /high visibility suits/ })
    ).not.toBeInTheDocument();
  });

  test("toggle label flips to 'Disable' when enabled", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    expect(screen.getByText(/Disable high visibility suits/)).toBeInTheDocument();
  });

  test("toggle starts with aria-pressed=false", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(
      screen.getByRole("button", { name: /high visibility suits/ })
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("toggle reflects enabled state via aria-pressed=true", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    expect(
      screen.getByRole("button", { name: /high visibility suits/ })
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("toggling persists the new value to localStorage", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  test("invokes onHighVisibilityChange with the new value when toggled on", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Options onNewGame={() => {}} onHighVisibilityChange={onChange} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("invokes onHighVisibilityChange with false when toggled back off", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Options onNewGame={() => {}} onHighVisibilityChange={onChange} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    await user.click(screen.getByText(/Disable high visibility suits/));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
