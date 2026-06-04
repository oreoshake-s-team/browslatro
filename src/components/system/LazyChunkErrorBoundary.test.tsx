import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import type { ReactElement } from "react";
import LazyChunkErrorBoundary, {
  isChunkLoadError,
} from "./LazyChunkErrorBoundary";

function Thrower({ error }: { readonly error: Error }): null {
  throw error;
}

function Healthy(): ReactElement {
  return <div data-testid="healthy-child">ok</div>;
}

describe("isChunkLoadError", () => {
  test("matches Chrome / Firefox dynamic import failures", () => {
    const err = new TypeError(
      "Failed to fetch dynamically imported module: https://example.com/assets/RoundWonModal-XYZ.js",
    );
    expect(isChunkLoadError(err)).toBe(true);
  });

  test("matches Safari dynamic import failures", () => {
    const err = new TypeError("Importing a module script failed.");
    expect(isChunkLoadError(err)).toBe(true);
  });

  test("matches strict-MIME module script failures", () => {
    const err = new TypeError(
      'Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".',
    );
    expect(isChunkLoadError(err)).toBe(true);
  });

  test("does not match unrelated runtime errors", () => {
    expect(isChunkLoadError(new TypeError("Cannot read property 'x' of undefined"))).toBe(
      false,
    );
  });

  test("does not match non-Error values", () => {
    expect(isChunkLoadError("Failed to fetch dynamically imported module")).toBe(false);
  });
});

describe("LazyChunkErrorBoundary", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test("renders children when no error is thrown", () => {
    render(
      <LazyChunkErrorBoundary>
        <Healthy />
      </LazyChunkErrorBoundary>,
    );
    expect(screen.getByTestId("healthy-child")).toBeInTheDocument();
  });

  test("renders the reload prompt when a chunk-load error is thrown", () => {
    const err = new TypeError(
      "Failed to fetch dynamically imported module: https://example.com/assets/RoundWonModal-XYZ.js",
    );
    render(
      <LazyChunkErrorBoundary>
        <Thrower error={err} />
      </LazyChunkErrorBoundary>,
    );
    expect(screen.getByTestId("lazy-chunk-error")).toBeInTheDocument();
  });

  test("the reload prompt is accessible as an alertdialog", () => {
    const err = new TypeError("Importing a module script failed.");
    render(
      <LazyChunkErrorBoundary>
        <Thrower error={err} />
      </LazyChunkErrorBoundary>,
    );
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName(
      "A new version is available",
    );
  });

  test("clicking Reload invokes the onReload callback", async () => {
    const onReload = vi.fn();
    const err = new TypeError(
      "Failed to fetch dynamically imported module: https://example.com/assets/x.js",
    );
    render(
      <LazyChunkErrorBoundary onReload={onReload}>
        <Thrower error={err} />
      </LazyChunkErrorBoundary>,
    );
    await userEvent.click(screen.getByTestId("lazy-chunk-error-reload"));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  test("re-throws non-chunk errors so an outer boundary can handle them", () => {
    const err = new TypeError("Cannot read property 'x' of undefined");
    expect(() =>
      render(
        <LazyChunkErrorBoundary>
          <Thrower error={err} />
        </LazyChunkErrorBoundary>,
      ),
    ).toThrow(err);
  });
});
