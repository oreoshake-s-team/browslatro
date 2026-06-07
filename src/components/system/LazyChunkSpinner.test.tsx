import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import LazyChunkSpinner, {
  LAZY_CHUNK_SPINNER_DELAY_MS,
} from "./LazyChunkSpinner";

describe("LazyChunkSpinner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("exports the delay constant as 180ms", () => {
    expect(LAZY_CHUNK_SPINNER_DELAY_MS).toBe(180);
  });

  test("renders nothing before the delay fires", () => {
    render(<LazyChunkSpinner />);
    act(() => {
      vi.advanceTimersByTime(LAZY_CHUNK_SPINNER_DELAY_MS - 1);
    });
    expect(screen.queryByTestId("lazy-chunk-spinner")).toBeNull();
  });

  test("renders a status region after the delay fires", () => {
    render(<LazyChunkSpinner />);
    act(() => {
      vi.advanceTimersByTime(LAZY_CHUNK_SPINNER_DELAY_MS);
    });
    expect(screen.getByTestId("lazy-chunk-spinner")).toBeInTheDocument();
  });

  test("uses aria-live polite for the status announcement", () => {
    render(<LazyChunkSpinner />);
    act(() => {
      vi.advanceTimersByTime(LAZY_CHUNK_SPINNER_DELAY_MS);
    });
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  test("renders the default Loading… label", () => {
    render(<LazyChunkSpinner />);
    act(() => {
      vi.advanceTimersByTime(LAZY_CHUNK_SPINNER_DELAY_MS);
    });
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  test("applies the overlay class when variant is overlay", () => {
    render(<LazyChunkSpinner variant="overlay" />);
    act(() => {
      vi.advanceTimersByTime(LAZY_CHUNK_SPINNER_DELAY_MS);
    });
    expect(screen.getByTestId("lazy-chunk-spinner")).toHaveClass(
      "lazy-chunk-spinner--overlay",
    );
  });

  test("inline variant omits the overlay class", () => {
    render(<LazyChunkSpinner variant="inline" />);
    act(() => {
      vi.advanceTimersByTime(LAZY_CHUNK_SPINNER_DELAY_MS);
    });
    expect(screen.getByTestId("lazy-chunk-spinner")).not.toHaveClass(
      "lazy-chunk-spinner--overlay",
    );
  });

  test("renders a custom label when provided", () => {
    render(<LazyChunkSpinner label="Loading shop…" />);
    act(() => {
      vi.advanceTimersByTime(LAZY_CHUNK_SPINNER_DELAY_MS);
    });
    expect(screen.getByText("Loading shop…")).toBeInTheDocument();
  });
});
