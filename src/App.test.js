import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

function getStatValue(label) {
  return screen.getByText(label).parentElement;
}

describe("initial state", () => {
  test("shows small blind with correct required score, money, ante, and round", () => {
    render(<App />);
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 300")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$0");
    expect(getStatValue("Ante")).toHaveTextContent("1");
    expect(getStatValue("Round")).toHaveTextContent("1");
  });
});

describe("Win button", () => {
  test("advances to big blind after one win", () => {
    render(<App />);
    userEvent.click(screen.getByText("Win"));
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 450")).toBeInTheDocument();
  });

  test("advances to boss blind after two wins", () => {
    render(<App />);
    userEvent.click(screen.getByText("Win"));
    userEvent.click(screen.getByText("Win"));
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 600")).toBeInTheDocument();
  });

  test("advances ante and resets to small blind after three wins", () => {
    render(<App />);
    userEvent.click(screen.getByText("Win"));
    userEvent.click(screen.getByText("Win"));
    userEvent.click(screen.getByText("Win"));
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 800")).toBeInTheDocument();
    expect(getStatValue("Ante")).toHaveTextContent("2");
  });

  test("increments round on each win", () => {
    render(<App />);
    userEvent.click(screen.getByText("Win"));
    userEvent.click(screen.getByText("Win"));
    expect(getStatValue("Round")).toHaveTextContent("3");
  });

  test("accumulates money correctly across blinds", () => {
    render(<App />);
    // small blind win: +3, big blind win: +4, boss blind win: +5
    userEvent.click(screen.getByText("Win"));
    expect(getStatValue("Money")).toHaveTextContent("$3");
    userEvent.click(screen.getByText("Win"));
    expect(getStatValue("Money")).toHaveTextContent("$7");
    userEvent.click(screen.getByText("Win"));
    expect(getStatValue("Money")).toHaveTextContent("$12");
  });
});

describe("Options modal reset", () => {
  test("opening options and clicking reset restores initial state", () => {
    render(<App />);

    // advance state so reset is meaningful
    userEvent.click(screen.getByText("Win"));
    userEvent.click(screen.getByText("Win"));
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
    expect(screen.getByText("$7")).toBeInTheDocument();

    // open modal
    userEvent.click(screen.getByText("Options"));
    expect(screen.getByRole("heading", { name: "Options" })).toBeInTheDocument();

    // click reset inside modal
    const modalResetButtons = screen.getAllByText("Reset");
    userEvent.click(modalResetButtons[0]);

    // modal should close and state should be reset
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 300")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$0");
    expect(getStatValue("Ante")).toHaveTextContent("1");
    expect(getStatValue("Round")).toHaveTextContent("1");
  });
});
