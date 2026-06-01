import { useAuth0 } from "@auth0/auth0-react";
import "./auth.css";

export function UserMenu() {
  const { isAuthenticated, user, logout } = useAuth0();

  if (!isAuthenticated) {
    return null;
  }

  const label = user?.name ?? user?.email ?? "Account";
  const redirectTo =
    typeof window === "undefined" ? undefined : window.location.origin;

  return (
    <div className="auth-user-menu">
      <span className="auth-user-name" aria-label="Signed in as">
        {label}
      </span>
      <button
        type="button"
        className="auth-user-logout"
        onClick={() => {
          void logout({ logoutParams: { returnTo: redirectTo } });
        }}
      >
        Log out
      </button>
    </div>
  );
}
