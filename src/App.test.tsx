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
    const chipsEl = document.querySelector(".chips") as HTMLElement;
    expect(chipsEl).toHaveTextContent("20");
    userEvent.click(screen.getByText(/Add Chips/));
    expect(chipsEl).toHaveTextContent("30");
  });
});

describe("Add Multiplier button integration", () => {
  test("clicking Add Multiplier updates multiplier shown in the sidebar", () => {
    render(<App />);
    const multiplierEl = document.querySelector(".multiplier") as HTMLElement;
    userEvent.click(screen.getByText(/Add Multiplier/));
    expect(multiplierEl).toHaveTextContent("3");
  });
});

describe("Multiply Multiplier button integration", () => {
  test("clicking Multiply Multiplier updates multiplier shown in the sidebar", () => {
    render(<App />);
    const multiplierEl = document.querySelector(".multiplier") as HTMLElement;
    userEvent.click(screen.getByText(/Multiply Multiplier/));
    expect(multiplierEl).toHaveTextContent("4");
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