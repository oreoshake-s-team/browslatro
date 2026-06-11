import { render, screen } from "@testing-library/react";
import { Telemetry } from "./Telemetry";

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));

vi.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: () => <div data-testid="vercel-speed-insights" />,
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Telemetry — gated on VITE_ON_VERCEL", () => {
  describe("on a Vercel build (VITE_ON_VERCEL=1)", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_ON_VERCEL", "1");
    });

    it("renders Vercel Analytics", async () => {
      render(<Telemetry />);
      expect(await screen.findByTestId("vercel-analytics")).toBeInTheDocument();
    });

    it("renders Vercel Speed Insights", async () => {
      render(<Telemetry />);
      expect(
        await screen.findByTestId("vercel-speed-insights"),
      ).toBeInTheDocument();
    });

    it("renders nothing visible once loaded", async () => {
      const { container } = render(<Telemetry />);
      await screen.findByTestId("vercel-analytics");
      expect(container).not.toHaveTextContent(/\S/);
    });
  });

  describe("off Vercel (VITE_ON_VERCEL unset / non-1)", () => {
    it("renders no Analytics script when the flag is absent", () => {
      vi.stubEnv("VITE_ON_VERCEL", "0");
      render(<Telemetry />);
      expect(screen.queryByTestId("vercel-analytics")).toBeNull();
    });

    it("renders no Speed Insights script when the flag is absent (negative)", () => {
      vi.stubEnv("VITE_ON_VERCEL", "0");
      render(<Telemetry />);
      expect(screen.queryByTestId("vercel-speed-insights")).toBeNull();
    });
  });
});
