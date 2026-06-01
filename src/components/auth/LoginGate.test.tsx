import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginGate } from "./LoginGate";

const mockUseAuth0 = vi.fn();

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => mockUseAuth0(),
}));

beforeEach(() => {
  mockUseAuth0.mockReset();
});

describe("LoginGate", () => {
  it("renders the login dialog when not authenticated", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: undefined,
      loginWithRedirect: vi.fn(),
    });
    render(
      <LoginGate>
        <div>Game content</div>
      </LoginGate>,
    );
    expect(screen.getByRole("dialog", { name: /sign in to play/i })).toBeInTheDocument();
  });

  it("shows the Log in button when not authenticated and not loading", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: undefined,
      loginWithRedirect: vi.fn(),
    });
    render(
      <LoginGate>
        <div>Game content</div>
      </LoginGate>,
    );
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("shows a loading status while Auth0 is initializing", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      error: undefined,
      loginWithRedirect: vi.fn(),
    });
    render(
      <LoginGate>
        <div>Game content</div>
      </LoginGate>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  });

  it("does not show the Log in button while loading", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      error: undefined,
      loginWithRedirect: vi.fn(),
    });
    render(
      <LoginGate>
        <div>Game content</div>
      </LoginGate>,
    );
    expect(screen.queryByRole("button", { name: /log in/i })).not.toBeInTheDocument();
  });

  it("calls loginWithRedirect when the Log in button is clicked", async () => {
    const loginWithRedirect = vi.fn().mockResolvedValue(undefined);
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: undefined,
      loginWithRedirect,
    });
    render(
      <LoginGate>
        <div>Game content</div>
      </LoginGate>,
    );
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(loginWithRedirect).toHaveBeenCalledTimes(1);
  });

  it("renders the error message when Auth0 reports an error", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: new Error("Boom"),
      loginWithRedirect: vi.fn(),
    });
    render(
      <LoginGate>
        <div>Game content</div>
      </LoginGate>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/boom/i);
  });

  it("renders children without the dialog when authenticated", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: undefined,
      loginWithRedirect: vi.fn(),
    });
    render(
      <LoginGate>
        <div>Game content</div>
      </LoginGate>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows children when authenticated", () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: undefined,
      loginWithRedirect: vi.fn(),
    });
    render(
      <LoginGate>
        <div>Game content</div>
      </LoginGate>,
    );
    expect(screen.getByText("Game content")).toBeInTheDocument();
  });
});
