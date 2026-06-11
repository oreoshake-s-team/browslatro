import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HelpDialog from "./HelpDialog";

describe("HelpDialog", () => {
  test("renders the How to play title", () => {
    render(<HelpDialog onClose={() => {}} />);
    expect(
      screen.getByRole("heading", { name: "How to play", level: 2 }),
    ).toBeInTheDocument();
  });

  test("renders the Text guides section heading", () => {
    render(<HelpDialog onClose={() => {}} />);
    expect(
      screen.getByRole("heading", { name: "Text guides", level: 3 }),
    ).toBeInTheDocument();
  });

  test("renders the Video tutorials section heading", () => {
    render(<HelpDialog onClose={() => {}} />);
    expect(
      screen.getByRole("heading", { name: "Video tutorials", level: 3 }),
    ).toBeInTheDocument();
  });

  test("exposes modal dialog semantics labelled by its title", () => {
    render(<HelpDialog onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("How to play");
  });

  test("links to the Balatro Wiki tutorial", () => {
    render(<HelpDialog onClose={() => {}} />);
    expect(
      screen.getByRole("link", { name: /Balatro Wiki — Tutorial/ }),
    ).toHaveAttribute("href", "https://balatrowiki.org/w/Tutorial");
  });

  test("opens external links in a new tab", () => {
    render(<HelpDialog onClose={() => {}} />);
    expect(
      screen.getByRole("link", { name: /Balatro Wiki — Tutorial/ }),
    ).toHaveAttribute("target", "_blank");
  });

  test("sets rel=noreferrer on external links", () => {
    render(<HelpDialog onClose={() => {}} />);
    expect(
      screen.getByRole("link", { name: /Balatro Wiki — Tutorial/ }),
    ).toHaveAttribute("rel", "noreferrer");
  });

  test("announces that the link opens in a new tab", () => {
    render(<HelpDialog onClose={() => {}} />);
    expect(
      screen.getByRole("link", {
        name: /Balatro Wiki — Tutorial.*opens in new tab/,
      }),
    ).toBeInTheDocument();
  });

  test("renders a link for every curated tutorial", () => {
    render(<HelpDialog onClose={() => {}} />);
    expect(screen.getAllByRole("link")).toHaveLength(6);
  });

  test("links to a YouTube video tutorial", () => {
    render(<HelpDialog onClose={() => {}} />);
    expect(
      screen.getByRole("link", {
        name: /Complete Beginner's Guide to Balatro/,
      }),
    ).toHaveAttribute("href", "https://www.youtube.com/watch?v=zP-s2aRNbL8");
  });

  test("Close button invokes onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HelpDialog onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clicking the overlay invokes onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HelpDialog onClose={onClose} />);
    await user.click(document.querySelector(".help-overlay") as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clicking inside the modal does not invoke onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HelpDialog onClose={onClose} />);
    await user.click(screen.getByRole("heading", { name: "How to play" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  test("Escape invokes onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HelpDialog onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
