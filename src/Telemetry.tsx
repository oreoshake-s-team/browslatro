import { Suspense, lazy } from "react";

const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })),
);
const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/react").then((m) => ({
    default: m.SpeedInsights,
  })),
);

export function Telemetry() {
  return (
    <Suspense fallback={null}>
      <SpeedInsights />
      <Analytics />
    </Suspense>
  );
}
