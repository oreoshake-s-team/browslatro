import { useAuth0 } from "@auth0/auth0-react";
import type { ReactNode } from "react";
import "./auth.css";

interface LoginGateProps {
  children: ReactNode;
}

export function LoginGate({ children }: LoginGateProps) {
  const { isAuthenticated, isLoading, error, loginWithRedirect } = useAuth0();

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <>
      <div aria-hidden="true" className="auth-gate-blocker">
        {children}
      </div>
      <div
        className="auth-gate-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-gate-title"
      >
        <div className="auth-gate-card">
          <h1 id="auth-gate-title" className="auth-gate-title">
            Sign in to play
          </h1>
          {isLoading ? (
            <p className="auth-gate-status" role="status">
              Loading…
            </p>
          ) : (
            <>
              <p className="auth-gate-status">
                You need an account to access Browslatro.
              </p>
              <button
                type="button"
                className="auth-gate-button"
                onClick={() => {
                  void loginWithRedirect();
                }}
              >
                Log in
              </button>
              {error ? (
                <p className="auth-gate-error" role="alert">
                  {error.message}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
