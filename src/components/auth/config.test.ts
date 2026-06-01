import { isAuthEnabled } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAuthEnabled", () => {
  it("returns false when both env vars are unset", () => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "");
    expect(isAuthEnabled()).toBe(false);
  });

  it("returns false when only the domain is set", () => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "tenant.us.auth0.com");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "");
    expect(isAuthEnabled()).toBe(false);
  });

  it("returns false when only the client id is set", () => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "abc123");
    expect(isAuthEnabled()).toBe(false);
  });

  it("returns true when both env vars are set", () => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "tenant.us.auth0.com");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "abc123");
    expect(isAuthEnabled()).toBe(true);
  });
});
