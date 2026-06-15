import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "./Modal";

function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  return render(
    <Modal onClose={() => {}} labelledBy="modal-title" {...props}>
      <h2 id="modal-title">Title</h2>
      <button type="button">Inside</button>
    </Modal>,
  );
}

describe("Modal rendering", () => {
  test("renders its children into the document body via a portal", () => {
    renderModal();
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  test("exposes a labelled dialog role", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-labelledby",
      "modal-title",
    );
  });

  test("applies the accent modifier class to the panel", () => {
    renderModal({ accent: "pack", testId: "m" });
    expect(screen.getByTestId("m")).toHaveClass("modal-panel--pack");
  });

  test("applies the size modifier class to the panel", () => {
    renderModal({ size: "lg", testId: "m" });
    expect(screen.getByTestId("m")).toHaveClass("modal-panel--lg");
  });

  test("raises the overlay z-index for the elevated level", () => {
    renderModal({ level: "elevated" });
    expect(screen.getByRole("dialog").parentElement).toHaveClass(
      "modal-overlay--elevated",
    );
  });
});

describe("Modal dismissal", () => {
  test("Escape invokes onClose by default", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Escape does not invoke onClose when closeOnEscape is false", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose, closeOnEscape: false });
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  test("clicking the backdrop invokes onClose by default", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });
    await user.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clicking inside the panel does not invoke onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });
    await user.click(screen.getByRole("button", { name: "Inside" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  test("clicking the backdrop does not invoke onClose when closeOnBackdrop is false", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose, closeOnBackdrop: false });
    await user.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("Modal focus management", () => {
  test("moves focus into the panel on open and restores it to the opener on close", async () => {
    render(<button data-testid="opener">opener</button>);
    screen.getByTestId("opener").focus();
    const view = renderModal();
    expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();
    view.unmount();
    expect(screen.getByTestId("opener")).toHaveFocus();
  });
});
