import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App";

afterEach(() => {
  document
    .querySelectorAll("[data-seo-shell]")
    .forEach((node) => node.remove());
});

test("mounting the app dismisses the SEO loading shell", async () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi
      .fn()
      .mockReturnValue({ matches: true } as unknown as MediaQueryList),
  });
  const shell = document.createElement("main");
  shell.setAttribute("data-seo-shell", "");
  document.body.appendChild(shell);
  render(<App />);
  await waitFor(() =>
    expect(document.querySelector("[data-seo-shell]")).toBeNull(),
  );
});
