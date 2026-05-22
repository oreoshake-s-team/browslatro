import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

function getStatValue(label) {
  return screen.getByText(label).parentElement;
}

describe("Win button integration", () => {
  test("advances blind, ante, round, and money across a full ante cycle", () => {
    render(<App />);
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 300")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$0");

    userEvent.click(screen.getByText("Win")); // small → big, +$3
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 450")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$3");
    expect(getStatValue("Round")).toHaveTextContent("2");

    userEvent.click(screen.getByText("Win")); // big → boss, +$4
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$7");

    userEvent.click(screen.getByText("Win")); // boss → ante 2 small, +$5
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 800")).toBeInTheDocument();
    expect(getStatValue("Ante")).toHaveTextContent("2");
    expect(getStatValue("Money")).toHaveTextContent("$12");
  });
});

describe("Options modal reset integration", () => {
  test("opening options and clicking reset restores initial state", () => {
    render(<App />);

    userEvent.click(screen.getByText("Win"));
    userEvent.click(screen.getByText("Win"));
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