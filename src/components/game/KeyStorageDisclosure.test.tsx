import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import KeyStorageDisclosure from "./KeyStorageDisclosure";

describe("KeyStorageDisclosure", () => {
  test("discloses that the key is stored in local storage", () => {
    render(<KeyStorageDisclosure />);
    expect(screen.getByTestId("key-storage-disclosure")).toHaveTextContent(
      "local storage",
    );
  });

  test("discloses that requests are proxied through our server to Anthropic", () => {
    render(<KeyStorageDisclosure />);
    expect(screen.getByTestId("key-storage-disclosure")).toHaveTextContent(
      "forwards it to Anthropic",
    );
  });

  test("warns that anyone with browser access can read the key", () => {
    render(<KeyStorageDisclosure />);
    expect(screen.getByTestId("key-storage-disclosure")).toHaveTextContent(
      "Anyone who can use this browser or device can read it",
    );
  });

  test("exposes an accessible region label", () => {
    render(<KeyStorageDisclosure />);
    expect(
      screen.getByRole("region", { name: "How your key is handled" }),
    ).toBeInTheDocument();
  });
});
