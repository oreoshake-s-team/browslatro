import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Help from "./Help";

describe("Help", () => {
  test("dialog is absent before the Help button is pressed", () => {
    render(<Help />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("clicking the Help button opens the How to play dialog", async () => {
    const user = userEvent.setup();
    render(<Help />);
    await user.click(screen.getByRole("button", { name: "Help" }));
    expect(
      await screen.findByRole("heading", { name: "How to play" }),
    ).toBeInTheDocument();
  });

  test("Close button dismisses the dialog", async () => {
    const user = userEvent.setup();
    render(<Help />);
    await user.click(screen.getByRole("button", { name: "Help" }));
    await user.click(await screen.findByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("Escape closes the dialog", async () => {
    const user = userEvent.setup();
    render(<Help />);
    await user.click(screen.getByRole("button", { name: "Help" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("restores focus to the Help button after closing", async () => {
    const user = userEvent.setup();
    render(<Help />);
    const trigger = screen.getByRole("button", { name: "Help" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });
});

describe("Help i18n", () => {
  afterEach(async () => {
    const { restoreEnglishLocale } = await import(
      "../../i18n/i18n.test-helpers"
    );
    await restoreEnglishLocale();
  });

  test("renders the trigger label under the haw locale", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(<Help />);
    expect(screen.getByRole("button", { name: "Kōkua" })).toBeInTheDocument();
  });
});
