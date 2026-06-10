import { Suspense, lazy } from "react";
import LazyChunkSpinner from "./components/system/LazyChunkSpinner";

const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })),
);
const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/react").then((m) => ({
    default: m.SpeedInsights,
  })),
);

export function Telemetry() {
  if (import.meta.env.VITE_ON_VERCEL !== "1") return null;
  return (
    <Suspense fallback={<LazyChunkSpinner />}>
      <SpeedInsights />
      <Analytics />
    </Suspense>
  );
}
