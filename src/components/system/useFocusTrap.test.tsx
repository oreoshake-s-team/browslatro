import { useRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { useFocusTrap } from "./useFocusTrap";

function TrapDialog({
  onClose,
  active = true,
}: {
  onClose: () => void;
  active?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <div ref={ref} role="dialog" aria-label="Trap dialog">
      <button onClick={onClose}>inside first</button>
      <button>inside last</button>
    </div>
  );
}

function Harness({ trapActive = true }: { trapActive?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div data-app-shell="">
        <button onClick={() => setOpen(true)}>open dialog</button>
        <button>background action</button>
      </div>
      {open && (
        <TrapDialog active={trapActive} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function shell(): HTMLElement {
  const el = document.querySelector("[data-app-shell]");
  if (!(el instanceof HTMLElement)) throw new Error("shell missing");
  return el;
}

describe("useFocusTrap", () => {
  test("moves focus to the first focusable element on open", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open dialog" }));
    expect(screen.getByRole("button", { name: "inside first" })).toHaveFocus();
  });

  test("Tab from the last focusable wraps to the first", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open dialog" }));
    await user.tab();
    expect(screen.getByRole("button", { name: "inside last" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "inside first" })).toHaveFocus();
  });

  test("Shift+Tab from the first focusable wraps to the last", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open dialog" }));
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "inside last" })).toHaveFocus();
  });

  test("marks the app shell inert while the trap is active", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open dialog" }));
    expect(shell()).toHaveAttribute("inert");
  });

  test("removes inert from the app shell and restores focus to the trigger on close", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open dialog" }));
    await user.click(screen.getByRole("button", { name: "inside first" }));
    expect(shell()).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "open dialog" })).toHaveFocus();
  });

  test("keeps the app shell inert while another trap is still open", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Harness />
        <TrapDialog onClose={() => {}} />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "open dialog" }));
    await user.click(screen.getAllByRole("button", { name: "inside first" })[0]);
    expect(shell()).toHaveAttribute("inert");
  });

  test("does not steal focus or inert the shell when inactive (negative)", async () => {
    const user = userEvent.setup();
    render(<Harness trapActive={false} />);
    await user.click(screen.getByRole("button", { name: "open dialog" }));
    expect(shell()).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "open dialog" })).toHaveFocus();
  });
});
