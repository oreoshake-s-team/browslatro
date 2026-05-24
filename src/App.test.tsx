import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

jest.mock("./components/sounds", () => ({ play: jest.fn() }));

function getStatValue(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

describe("Win button integration", () => {
  test("advances blind, ante, round, and money across a full ante cycle", () => {
    render(<App />);
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 300")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$0");

    userEvent.click(screen.getByText(/Win/)); // small → big, +$3
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 450")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$3");
    expect(getStatValue("Round")).toHaveTextContent("2");

    userEvent.click(screen.getByText(/Win/)); // big → boss, +$4
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$7");

    userEvent.click(screen.getByText(/Win/)); // boss → ante 2 small, +$5
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 800")).toBeInTheDocument();
    expect(getStatValue("Ante")).toHaveTextContent("2");
    expect(getStatValue("Money")).toHaveTextContent("$12");
  });
});

describe("Add Chips button integration", () => {
  test("clicking Add Chips updates chips shown in the sidebar", () => {
    render(<App />);
    userEvent.click(screen.getByText(/Add Chips/));
    expect(document.querySelector(".chips")).toHaveTextContent("30");
  });
});

describe("Add Multiplier button integration", () => {
  test("clicking Add Multiplier updates multiplier shown in the sidebar", () => {
    render(<App />);
    userEvent.click(screen.getByText(/Add Multiplier/));
    expect(document.querySelector(".multiplier")).toHaveTextContent("3");
  });
});

describe("Multiply Multiplier button integration", () => {
  test("clicking Multiply Multiplier updates multiplier shown in the sidebar", () => {
    render(<App />);
    userEvent.click(screen.getByText(/Multiply Multiplier/));
    expect(document.querySelector(".multiplier")).toHaveTextContent("4");
  });
});

function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByLabelText("Your hand").querySelectorAll("button")
  );
}

describe("Card selection drives hand detection", () => {
  test("selecting a single card sets chips to High Card chip value", () => {
    render(<App />);
    userEvent.click(getHandCardButtons()[0]);
    expect(document.querySelector(".chips")).toHaveTextContent("5");
  });

  test("selecting a single card sets multiplier to High Card multiplier value", () => {
    render(<App />);
    userEvent.click(getHandCardButtons()[0]);
    expect(document.querySelector(".multiplier")).toHaveTextContent("1");
  });

  test("clicking a selected card deselects it", () => {
    render(<App />);
    const cards = getHandCardButtons();
    userEvent.click(cards[0]);
    userEvent.click(cards[0]);
    expect(cards[0]).toHaveAttribute("aria-pressed", "false");
  });

  test("selection cap of 5 blocks a 6th selection", () => {
    render(<App />);
    const cards = getHandCardButtons();
    for (let i = 0; i < 6; i++) {
      userEvent.click(cards[i]);
    }
    const selectedCount = getHandCardButtons().filter(
      (btn) => btn.getAttribute("aria-pressed") === "true"
    ).length;
    expect(selectedCount).toBe(5);
  });

  test("deselecting frees a slot so a previously blocked card can be selected", () => {
    render(<App />);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i++) {
      userEvent.click(cards[i]);
    }
    userEvent.click(cards[0]);
    userEvent.click(cards[5]);
    expect(getHandCardButtons()[5]).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Submitting a hand discards the selected cards", () => {
  test("clears all selection highlights after submit", () => {
    render(<App />);
    const cards = getHandCardButtons();
    userEvent.click(cards[0]);
    userEvent.click(cards[1]);
    userEvent.click(screen.getByText(/Submit Hand/));
    const selectedCount = getHandCardButtons().filter(
      (btn) => btn.getAttribute("aria-pressed") === "true"
    ).length;
    expect(selectedCount).toBe(0);
  });

  test("keeps the hand at 8 cards by drawing replacements from the deck", () => {
    render(<App />);
    const cards = getHandCardButtons();
    userEvent.click(cards[0]);
    userEvent.click(cards[1]);
    userEvent.click(cards[2]);
    userEvent.click(screen.getByText(/Submit Hand/));
    expect(getHandCardButtons()).toHaveLength(8);
  });

  test("decrements the remaining deck count by the number of discarded cards", () => {
    render(<App />);
    const cards = getHandCardButtons();
    userEvent.click(cards[0]);
    userEvent.click(cards[1]);
    userEvent.click(cards[2]);
    userEvent.click(screen.getByText(/Submit Hand/));
    expect(
      screen.getByRole("button", { name: /Deck \(41 cards remaining\)/ })
    ).toBeInTheDocument();
  });

  test("replaces the originally-selected cards with different cards", () => {
    render(<App />);
    const beforeLabels = getHandCardButtons()
      .slice(0, 2)
      .map((btn) => btn.getAttribute("aria-label"));
    const cards = getHandCardButtons();
    userEvent.click(cards[0]);
    userEvent.click(cards[1]);
    userEvent.click(screen.getByText(/Submit Hand/));
    const afterLabels = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    const stillPresent = beforeLabels.filter((label) =>
      afterLabels.includes(label)
    );
    expect(stillPresent).toEqual([]);
  });

  test("submitting with no cards selected leaves the hand unchanged", () => {
    render(<App />);
    const before = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    userEvent.click(screen.getByText(/Submit Hand/));
    const after = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    expect(after).toEqual(before);
  });
});

describe("Submit Hand button integration", () => {
  test("updates round score by chips × multiplier then resets chips and multiplier", () => {
    render(<App />);
    userEvent.click(screen.getByText(/Add Chips/));
    userEvent.click(screen.getByText(/Add Multiplier/));
    userEvent.click(screen.getByText(/Submit Hand/));
    const roundScoreEl = document.querySelector(".round-score-value") as HTMLElement;
    const chipsEl = document.querySelector(".chips") as HTMLElement;
    const multiplierEl = document.querySelector(".multiplier") as HTMLElement;
    expect(roundScoreEl).toHaveTextContent("90");
    expect(chipsEl).toHaveTextContent("20");
    expect(multiplierEl).toHaveTextContent("2");
  });
});

describe("Submit Hand win integration", () => {
  test("submitting a hand that meets the required score advances the blind", () => {
    render(<App />);
    // Inflate score with modifiers: chips 20, mult 2 → 2 ×2 ×2 ×2 = 16, 20 × 16 = 320 ≥ 300
    userEvent.click(screen.getByText(/Multiply Multiplier/));
    userEvent.click(screen.getByText(/Multiply Multiplier/));
    userEvent.click(screen.getByText(/Multiply Multiplier/));
    userEvent.click(screen.getByText(/Submit Hand/));
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
  });
});

describe("Losing integration", () => {
  beforeEach(() => {
    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("exhausting all hands without reaching the required score shows a game over alert", () => {
    render(<App />);
    userEvent.click(screen.getByText(/Submit Hand/));
    userEvent.click(screen.getByText(/Submit Hand/));
    userEvent.click(screen.getByText(/Submit Hand/));
    userEvent.click(screen.getByText(/Submit Hand/));
    expect(window.alert).toHaveBeenCalledWith("Game Over! Try again.");
  });

  test("exhausting all hands without reaching the required score resets the game", () => {
    render(<App />);
    userEvent.click(screen.getByText(/Submit Hand/));
    userEvent.click(screen.getByText(/Submit Hand/));
    userEvent.click(screen.getByText(/Submit Hand/));
    userEvent.click(screen.getByText(/Submit Hand/));
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
  });
});

describe("Add Money button integration", () => {
  test("clicking Add $10 updates money shown in the sidebar", () => {
    render(<App />);
    userEvent.click(screen.getByText(/Add \$10/));
    expect(getStatValue("Money")).toHaveTextContent("$10");
  });
});

describe("Subtract Money button integration", () => {
  test("clicking Subtract $10 updates money shown in the sidebar", () => {
    render(<App />);
    userEvent.click(screen.getByText(/Add \$10/));
    userEvent.click(screen.getByText(/Subtract \$10/));
    expect(getStatValue("Money")).toHaveTextContent("$0");
  });
});

describe("Options modal reset integration", () => {
  test("opening options and clicking reset restores initial state", () => {
    render(<App />);

    userEvent.click(screen.getByText(/Win/));
    userEvent.click(screen.getByText(/Win/));
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$7"); // was $7 before reset

    userEvent.click(screen.getByText("Options"));
    expect(screen.getByRole("heading", { name: "Options" })).toBeInTheDocument();

    userEvent.click(screen.getByText("Reset"));

    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 300")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$0"); // was $7 before reset
    expect(getStatValue("Ante")).toHaveTextContent("1");
    expect(getStatValue("Round")).toHaveTextContent("1");
  });
});