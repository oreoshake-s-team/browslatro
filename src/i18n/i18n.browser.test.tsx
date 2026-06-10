import { act, render, screen } from "@testing-library/react";
import i18n, { detectLocale, persistLocale } from "./index";
import RunProgress from "../components/hud/RunProgress";
import Consumables from "../components/consumables/Consumables";
import DiscardPile from "../components/cards/DiscardPile";

const STORAGE_KEY = "browslatro:locale";

afterEach(() => {
  window.localStorage.removeItem(STORAGE_KEY);
});

describe("detectLocale in the browser", () => {
  test("returns a stored supported locale", () => {
    window.localStorage.setItem(STORAGE_KEY, "haw");
    expect(detectLocale()).toBe("haw");
  });

  test("ignores a stored unsupported locale", () => {
    window.localStorage.setItem(STORAGE_KEY, "klingon");
    expect(detectLocale()).toBe("en");
  });

  test("uses the navigator language when it is Hawaiian", () => {
    const spy = vi
      .spyOn(window.navigator, "language", "get")
      .mockReturnValue("haw-US");
    expect(detectLocale()).toBe("haw");
    spy.mockRestore();
  });

  test("falls back to en for an unrelated navigator language", () => {
    const spy = vi
      .spyOn(window.navigator, "language", "get")
      .mockReturnValue("fr-FR");
    expect(detectLocale()).toBe("en");
    spy.mockRestore();
  });

  test("prefers the stored locale over the navigator language", () => {
    window.localStorage.setItem(STORAGE_KEY, "en");
    const spy = vi
      .spyOn(window.navigator, "language", "get")
      .mockReturnValue("haw");
    expect(detectLocale()).toBe("en");
    spy.mockRestore();
  });
});

describe("persistLocale", () => {
  test("writes the locale to localStorage", () => {
    persistLocale("haw");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("haw");
  });
});

describe("language change side effects", () => {
  test("updates document.documentElement.lang", async () => {
    await i18n.changeLanguage("haw");
    expect(document.documentElement.lang).toBe("haw");
  });
});

describe("Hawaiian rendering", () => {
  test("RunProgress renders the Hawaiian money label", async () => {
    await i18n.changeLanguage("haw");
    render(<RunProgress ante={1} round={1} money={4} />);
    expect(screen.getByText("Kālā")).toBeInTheDocument();
  });

  test("RunProgress does not render the English money label in Hawaiian", async () => {
    await i18n.changeLanguage("haw");
    render(<RunProgress ante={1} round={1} money={4} />);
    expect(screen.queryByText("Money")).not.toBeInTheDocument();
  });

  test("RunProgress renders English labels after switching back", async () => {
    await i18n.changeLanguage("haw");
    await i18n.changeLanguage("en");
    render(<RunProgress ante={1} round={1} money={4} />);
    expect(screen.getByText("Money")).toBeInTheDocument();
  });
});

describe("Hawaiian aria-labels (issue #924)", () => {
  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
  });

  test("Consumables tray exposes the Hawaiian aria-label", async () => {
    await i18n.changeLanguage("haw");
    render(<Consumables consumables={[]} selectedCount={0} onUse={() => {}} />);
    expect(screen.getByLabelText("Nā wahi consumable")).toBeInTheDocument();
  });

  test("Consumables tray does not expose the English aria-label in Hawaiian", async () => {
    await i18n.changeLanguage("haw");
    render(<Consumables consumables={[]} selectedCount={0} onUse={() => {}} />);
    expect(screen.queryByLabelText("Consumable slots")).not.toBeInTheDocument();
  });

  test("Consumables tray exposes the English aria-label after switching back", async () => {
    await i18n.changeLanguage("haw");
    await i18n.changeLanguage("en");
    render(<Consumables consumables={[]} selectedCount={0} onUse={() => {}} />);
    expect(screen.getByLabelText("Consumable slots")).toBeInTheDocument();
  });

  test("DiscardPile announces the Hawaiian label with the card count", async () => {
    await i18n.changeLanguage("haw");
    render(<DiscardPile discarded={[]} />);
    expect(screen.getByLabelText("Pūʻulu kiola (0 kāleka)")).toBeInTheDocument();
  });
});
