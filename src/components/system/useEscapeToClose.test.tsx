import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEscapeToClose } from "./useEscapeToClose";

function Probe({ onClose, isOpen }: { onClose: () => void; isOpen: boolean }) {
  useEscapeToClose(onClose, isOpen);
  return null;
}

describe("useEscapeToClose", () => {
  test("invokes onClose when Escape is pressed while open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Probe onClose={onClose} isOpen={true} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("ignores Escape while closed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Probe onClose={onClose} isOpen={false} />);
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  test("ignores non-Escape keys while open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Probe onClose={onClose} isOpen={true} />);
    await user.keyboard("{Enter}");
    expect(onClose).not.toHaveBeenCalled();
  });

  test("detaches its listener on unmount", () => {
    const onClose = vi.fn();
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const before = removeSpy.mock.calls.filter(([t]) => t === "keydown").length;
    const { unmount } = render(<Probe onClose={onClose} isOpen={true} />);
    unmount();
    const after = removeSpy.mock.calls.filter(([t]) => t === "keydown").length;
    removeSpy.mockRestore();
    expect(after).toBe(before + 1);
  });
});
