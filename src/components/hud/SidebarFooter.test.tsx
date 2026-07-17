import { render, screen } from "@testing-library/react";
import SidebarFooter from "./SidebarFooter";

describe("SidebarFooter", () => {
  test("renders a link to the GitHub repository", () => {
    render(<SidebarFooter />);
    const link = screen.getByRole("link", { name: /github/i });
    expect(link).toBeInTheDocument();
  });

  test("link points to the browslatro GitHub repo", () => {
    render(<SidebarFooter />);
    const link = screen.getByRole("link", { name: /github/i });
    expect(link).toHaveAttribute("href", "https://github.com/oreoshake-s-team/browslatro");
  });

  test("link opens in a new tab", () => {
    render(<SidebarFooter />);
    const link = screen.getByRole("link", { name: /github/i });
    expect(link).toHaveAttribute("target", "_blank");
  });

  test("link has rel=noopener noreferrer for security", () => {
    render(<SidebarFooter />);
    const link = screen.getByRole("link", { name: /github/i });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("link text includes 'View on GitHub'", () => {
    render(<SidebarFooter />);
    expect(screen.getByText("View on GitHub")).toBeInTheDocument();
  });

  test("GitHub icon is hidden from assistive technology", () => {
    render(<SidebarFooter />);
    const svg = document.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  test("link transitions colors under the animation-speed default", () => {
    render(<SidebarFooter />);
    const link = screen.getByRole("link", { name: /github/i });
    expect(link).toHaveClass("transition-colors");
  });

  test("link carries the shared focus-ring utility", () => {
    render(<SidebarFooter />);
    const link = screen.getByRole("link", { name: /github/i });
    expect(link).toHaveClass("focus-ring");
  });

  test("footer hides in narrow portrait viewports", () => {
    render(<SidebarFooter />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveClass("portrait-narrow:hidden");
  });
});
