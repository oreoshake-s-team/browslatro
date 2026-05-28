import { act, render, screen } from "@testing-library/react";
import { NOPE_ANIMATION_MS } from "./NopeAnimation";
import NopeAnimation from "./NopeAnimation";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("NopeAnimation", () => {
  test("renders nothing before any trigger", () => {
    render(<NopeAnimation triggerKey={0} />);
    expect(screen.queryByTestId("nope-animation")).not.toBeInTheDocument();
  });

  test("shows the Nope! text when the trigger key changes", () => {
    const { rerender } = render(<NopeAnimation triggerKey={0} />);
    rerender(<NopeAnimation triggerKey={1} />);
    expect(screen.getByTestId("nope-animation")).toHaveTextContent("Nope!");
  });

  test("announces the miss via an assertive live region", () => {
    const { rerender } = render(<NopeAnimation triggerKey={0} />);
    rerender(<NopeAnimation triggerKey={1} />);
    expect(screen.getByText("Nope!").parentElement).toHaveAttribute(
      "aria-live",
      "assertive",
    );
  });

  test("hides the popup after the animation duration elapses", () => {
    const { rerender } = render(<NopeAnimation triggerKey={0} />);
    rerender(<NopeAnimation triggerKey={1} />);
    act(() => {
      vi.advanceTimersByTime(NOPE_ANIMATION_MS);
    });
    expect(screen.queryByTestId("nope-animation")).not.toBeInTheDocument();
  });

  test("re-shows the popup on a subsequent trigger", () => {
    const { rerender } = render(<NopeAnimation triggerKey={1} />);
    act(() => {
      vi.advanceTimersByTime(NOPE_ANIMATION_MS);
    });
    rerender(<NopeAnimation triggerKey={2} />);
    expect(screen.getByTestId("nope-animation")).toBeInTheDocument();
  });
});
