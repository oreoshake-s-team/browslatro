import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserMenu } from "./UserMenu";

const mockUseAuth0 = vi.fn();

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => mockUseAuth0(),
}));

beforeEach(() => {
  mockUseAuth0.mockReset();
});

describe("UserMenu", () => {
  it("renders nothing when not authenticated", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      user: undefined,
      logout: vi.fn(),
    });
    const { container } = render(<UserMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the user name when authenticated", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      user: { name: "Ada Lovelace", email: "ada@example.com" },
      logout: vi.fn(),
    });
    render(<UserMenu />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("falls back to the email when no name is provided", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      user: { email: "ada@example.com" },
      logout: vi.fn(),
    });
    render(<UserMenu />);
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("falls back to the literal 'Account' when no name or email exists", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      user: {},
      logout: vi.fn(),
    });
    render(<UserMenu />);
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("calls logout when the Log out button is clicked", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      user: { name: "Ada" },
      logout,
    });
    render(<UserMenu />);
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("passes a returnTo origin when logging out", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      user: { name: "Ada" },
      logout,
    });
    render(<UserMenu />);
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: window.location.origin },
    });
  });

  it("does not render a logout button when unauthenticated", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      user: { name: "Ada" },
      logout: vi.fn(),
    });
    render(<UserMenu />);
    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
  });
});
