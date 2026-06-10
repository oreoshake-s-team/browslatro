import { act, render, screen } from "@testing-library/react";
import LiveAnnouncer, { announce } from "./LiveAnnouncer";

describe("LiveAnnouncer", () => {
  test("renders a polite status region", () => {
    render(<LiveAnnouncer />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  test("renders an atomic region so partial updates are read in full", () => {
    render(<LiveAnnouncer />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
  });

  test("announce renders the message into the region", () => {
    render(<LiveAnnouncer />);
    act(() => announce("Card moved"));
    expect(screen.getByRole("status")).toHaveTextContent("Card moved");
  });

  test("a newer announcement replaces the previous one", () => {
    render(<LiveAnnouncer />);
    act(() => announce("First message"));
    act(() => announce("Second message"));
    expect(screen.getByRole("status").textContent).toBe("Second message");
  });

  test("repeating the same announcement still changes the rendered text", () => {
    render(<LiveAnnouncer />);
    act(() => announce("Same message"));
    const first = screen.getByRole("status").textContent;
    act(() => announce("Same message"));
    expect(screen.getByRole("status").textContent).not.toBe(first);
  });
});
