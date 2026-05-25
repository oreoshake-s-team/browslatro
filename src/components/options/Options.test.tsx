import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Options from "./Options";
import {
  getAnimationSpeed,
  isHighVisibility,
  isMuted,
  setAnimationSpeed,
  toggleHighVisibility,
  toggleMute,
} from "../system/preferences";

const STORAGE_KEY = "browslatro:highVisibility";
const MUTED_KEY = "browslatro:muted";
const ANIMATION_SPEED_KEY = "browslatro:animationSpeed";

function resetPreferences(): void {
  if (isHighVisibility()) {
    toggleHighVisibility();
  }
  if (isMuted()) {
    toggleMute();
  }
  if (getAnimationSpeed() !== "normal") {
    setAnimationSpeed("normal");
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(MUTED_KEY);
  window.localStorage.removeItem(ANIMATION_SPEED_KEY);
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

  test("Escape closes the modal when open", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
  });

  test("Escape while modal is closed does not open or change anything", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
  });

  test("Enter while modal is open does not close it", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Options" })).toBeInTheDocument();
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

describe("Options — animation speed", () => {
  afterEach(resetPreferences);

  test("renders the animation speed control inside the modal", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(screen.getByLabelText("Animation speed")).toBeInTheDocument();
  });

  test("defaults to normal when no preference is stored", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(screen.getByLabelText("Animation speed")).toHaveValue("normal");
  });

  test.each(["Slow", "Normal", "Fast", "Instant"])(
    "renders the %s option",
    async (label) => {
      const user = userEvent.setup();
      render(<Options onNewGame={() => {}} />);
      await user.click(screen.getByText("Options"));
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
    },
  );

  test("changing the value persists the new selection to localStorage", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.selectOptions(screen.getByLabelText("Animation speed"), "fast");
    expect(window.localStorage.getItem(ANIMATION_SPEED_KEY)).toBe("fast");
  });

  test("changing the value invokes onAnimationSpeedChange with the new value", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Options onNewGame={() => {}} onAnimationSpeedChange={onChange} />);
    await user.click(screen.getByText("Options"));
    await user.selectOptions(screen.getByLabelText("Animation speed"), "instant");
    expect(onChange).toHaveBeenLastCalledWith("instant");
  });

  test("reflects a previously stored value on the next mount", async () => {
    setAnimationSpeed("slow");
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(screen.getByLabelText("Animation speed")).toHaveValue("slow");
  });
});
