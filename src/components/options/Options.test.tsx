import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Options from "./Options";
import {
  getAnimationSpeed,
  isDyslexicFont,
  isHighVisibility,
  isMuted,
  setAnimationSpeed,
  toggleDyslexicFont,
  toggleHighVisibility,
  toggleMute,
} from "../system/preferences";

const STORAGE_KEY = "browslatro:highVisibility";
const DYSLEXIC_KEY = "browslatro:dyslexicFont";
const MUTED_KEY = "browslatro:muted";
const ANIMATION_SPEED_KEY = "browslatro:animationSpeed";
const LOCALE_KEY = "browslatro:locale";

function resetPreferences(): void {
  if (isHighVisibility()) {
    toggleHighVisibility();
  }
  if (isDyslexicFont()) {
    toggleDyslexicFont();
  }
  if (isMuted()) {
    toggleMute();
  }
  if (getAnimationSpeed() !== "normal") {
    setAnimationSpeed("normal");
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(DYSLEXIC_KEY);
  window.localStorage.removeItem(MUTED_KEY);
  window.localStorage.removeItem(ANIMATION_SPEED_KEY);
}

describe("Options", () => {
  beforeEach(resetPreferences);
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
    const onNewGame = vi.fn();
    render(<Options onNewGame={onNewGame} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));
    expect(onNewGame).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
  });

  test("New game button prompts window.confirm before invoking onNewGame", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true);
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    confirmSpy.mockClear();
    await user.click(screen.getByText("New game"));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  test("cancelling the confirm prompt skips onNewGame", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onNewGame = vi.fn();
    render(<Options onNewGame={onNewGame} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));
    expect(onNewGame).not.toHaveBeenCalled();
  });

  test("cancelling the confirm prompt leaves the Options modal open", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));
    expect(
      screen.getByRole("heading", { name: "Options" }),
    ).toBeInTheDocument();
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
    const onChange = vi.fn();
    render(<Options onNewGame={() => {}} onHighVisibilityChange={onChange} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("invokes onHighVisibilityChange with false when toggled back off", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Options onNewGame={() => {}} onHighVisibilityChange={onChange} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    await user.click(screen.getByText(/Disable high visibility suits/));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  test("dyslexic-font toggle starts off with aria-pressed=false", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(
      screen.getByRole("button", { name: "Use OpenDyslexic font" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("enabling the dyslexic font flips the label and persists true", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("Use OpenDyslexic font"));
    expect(screen.getByText("Use default font")).toBeInTheDocument();
    expect(window.localStorage.getItem(DYSLEXIC_KEY)).toBe("true");
  });

  test("toggling the dyslexic font back off persists false (negative)", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("Use OpenDyslexic font"));
    await user.click(screen.getByText("Use default font"));
    expect(window.localStorage.getItem(DYSLEXIC_KEY)).toBe("false");
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
    const onChange = vi.fn();
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

describe("Options — language picker", () => {
  afterEach(async () => {
    window.localStorage.removeItem(LOCALE_KEY);
    const { restoreEnglishLocale } = await import("../../i18n/i18n.test-helpers");
    await restoreEnglishLocale();
  });

  test("renders the language control inside the modal", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(screen.getByLabelText("Language")).toBeInTheDocument();
  });

  test("defaults to English", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(screen.getByLabelText("Language")).toHaveValue("en");
  });

  test("offers ʻŌlelo Hawaiʻi as an option", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(
      screen.getByRole("option", { name: "ʻŌlelo Hawaiʻi" }),
    ).toBeInTheDocument();
  });

  test("selecting Hawaiian translates the modal heading", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.selectOptions(screen.getByLabelText("Language"), "haw");
    expect(
      await screen.findByRole("heading", { name: "Nā koho" }),
    ).toBeInTheDocument();
  });

  test("selecting Hawaiian persists the locale to localStorage", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.selectOptions(screen.getByLabelText("Language"), "haw");
    await screen.findByLabelText("ʻŌlelo");
    expect(window.localStorage.getItem(LOCALE_KEY)).toBe("haw");
  });

  test("switching back to English restores the English heading", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.selectOptions(screen.getByLabelText("Language"), "haw");
    await user.selectOptions(await screen.findByLabelText("ʻŌlelo"), "en");
    expect(
      await screen.findByRole("heading", { name: "Options" }),
    ).toBeInTheDocument();
  });
});

describe("Options i18n", () => {
  afterEach(async () => {
    const { restoreEnglishLocale } = await import("../../i18n/i18n.test-helpers");
    await restoreEnglishLocale();
  });

  test("the New game button renders Pāʻani hou under the haw locale", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(<Options onNewGame={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Nā koho" }));
    expect(screen.getByRole("button", { name: "Pāʻani hou" })).toBeInTheDocument();
  });

  test("the Close button renders Pani under the haw locale", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(<Options onNewGame={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Nā koho" }));
    expect(screen.getByRole("button", { name: "Pani" })).toBeInTheDocument();
  });

  test("animation speed options render Lohi and Wikiwiki under the haw locale", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(<Options onNewGame={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Nā koho" }));
    expect(screen.getByRole("option", { name: "Lohi" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Wikiwiki" })).toBeInTheDocument();
  });

  test("the New game confirm copy stays English fallback under the haw locale (negative)", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Options onNewGame={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Nā koho" }));
    await userEvent.click(screen.getByRole("button", { name: "Pāʻani hou" }));
    expect(confirmSpy).toHaveBeenCalledWith(
      "Start a new game? This will end your current run.",
    );
    confirmSpy.mockRestore();
  });
});

describe("Options dialog semantics", () => {
  beforeEach(resetPreferences);
  afterEach(resetPreferences);

  test("open modal exposes dialog semantics labelled by its title", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Options");
  });

  test("moves focus into the dialog on open and restores it to the trigger on close", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Options" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("dialog is absent before the Options button is pressed", () => {
    render(<Options onNewGame={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Options — coach API key", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPreferences();
  });

  test("saving a key shows the masked tail", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.type(
      screen.getByTestId("options-advisor-key-input"),
      "sk-ant-api03-abcdefgh1234",
    );
    await user.click(screen.getByRole("button", { name: "Save key" }));
    expect(screen.getByTestId("options-advisor-key-masked")).toHaveTextContent(
      "sk-ant-…1234",
    );
  });

  test("removing the key clears storage after confirming", async () => {
    window.localStorage.setItem(
      "browslatro:advisor-player-key",
      "sk-ant-api03-abcdefgh1234",
    );
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(
      window.localStorage.getItem("browslatro:advisor-player-key"),
    ).toBeNull();
    confirmSpy.mockRestore();
  });

  test("cancelling the remove confirm keeps the stored key", async () => {
    window.localStorage.setItem(
      "browslatro:advisor-player-key",
      "sk-ant-api03-abcdefgh1234",
    );
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(
      window.localStorage.getItem("browslatro:advisor-player-key"),
    ).toBe("sk-ant-api03-abcdefgh1234");
    confirmSpy.mockRestore();
  });

  test("the key field shows the storage and proxy disclosure", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(screen.getByTestId("key-storage-disclosure")).toHaveTextContent(
      "forwards it to Anthropic",
    );
  });

  test("the modal panel carries the options-modal scope class", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(screen.getByRole("dialog").querySelector(".modal")).toHaveClass(
      "options-modal",
    );
  });

  test("toggle buttons use the shared game button style", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(screen.getByText(/Mute sounds/)).toHaveClass("btn", "btn--toggle");
  });

  test("New game button uses the shared danger button variant", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(screen.getByText("New game")).toHaveClass("btn", "btn--danger");
  });

  test("Close button uses the shared secondary button variant", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(screen.getByText("Close")).toHaveClass("btn", "btn--secondary");
  });

  test("negative: no legacy options-button elements remain", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    expect(document.querySelector(".options-button")).toBeNull();
  });

  test("New game and Close share the footer action row", async () => {
    const user = userEvent.setup();
    render(<Options onNewGame={() => {}} />);
    await user.click(screen.getByText("Options"));
    const footer = screen.getByText("New game").closest(".options-footer");
    expect(footer).toContainElement(screen.getByText("Close"));
  });
});
