import { writeFileSync } from "node:fs";

const PORT = Number(process.env.PORT ?? 3000);

export const ADMIN_STORAGE_STATE_PATH = "e2e/.admin-state.json";

export default function globalSetup(): void {
  const state = {
    cookies: [],
    origins: [
      {
        origin: `http://127.0.0.1:${PORT}`,
        localStorage: [{ name: "browslatro:adminMode", value: "true" }],
      },
    ],
  };
  writeFileSync(ADMIN_STORAGE_STATE_PATH, JSON.stringify(state));
}
