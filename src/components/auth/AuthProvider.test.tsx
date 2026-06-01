import { render, screen } from "@testing-library/react";
import { AuthProvider } from "./AuthProvider";

const mockAuth0Provider = vi.fn();

vi.mock("@auth0/auth0-react", () => ({
  Auth0Provider: (props: { children: React.ReactNode }) => {
    mockAuth0Provider(props);
    return <div data-testid="auth0-provider">{props.children}</div>;
  },
}));

beforeEach(() => {
  mockAuth0Provider.mockReset();
  vi.unstubAllEnvs();
});

describe("AuthProvider", () => {
  it("renders children without Auth0Provider when env vars are missing", () => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "");
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );
    expect(screen.queryByTestId("auth0-provider")).not.toBeInTheDocument();
  });

  it("wraps children in Auth0Provider when env vars are present", () => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "tenant.us.auth0.com");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "abc123");
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );
    expect(screen.getByTestId("auth0-provider")).toBeInTheDocument();
  });

  it("forwards the configured domain to Auth0Provider", () => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "tenant.us.auth0.com");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "abc123");
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );
    expect(mockAuth0Provider).toHaveBeenCalledWith(
      expect.objectContaining({ domain: "tenant.us.auth0.com" }),
    );
  });

  it("forwards the configured client id to Auth0Provider", () => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "tenant.us.auth0.com");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "abc123");
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );
    expect(mockAuth0Provider).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "abc123" }),
    );
  });

  it("includes the audience in authorizationParams when set", () => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "tenant.us.auth0.com");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "abc123");
    vi.stubEnv("VITE_AUTH0_AUDIENCE", "https://api.example.com");
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );
    expect(mockAuth0Provider).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationParams: expect.objectContaining({
          audience: "https://api.example.com",
        }),
      }),
    );
  });

  it("omits the audience when not set", () => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "tenant.us.auth0.com");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "abc123");
    vi.stubEnv("VITE_AUTH0_AUDIENCE", "");
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );
    const call = mockAuth0Provider.mock.calls[0]?.[0];
    expect(call.authorizationParams.audience).toBeUndefined();
  });
});
