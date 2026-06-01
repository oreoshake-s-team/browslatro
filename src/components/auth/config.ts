export function isAuthEnabled(): boolean {
  return Boolean(
    import.meta.env.VITE_AUTH0_DOMAIN &&
      import.meta.env.VITE_AUTH0_CLIENT_ID,
  );
}
