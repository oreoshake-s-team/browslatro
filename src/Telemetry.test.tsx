import { render, screen } from "@testing-library/react";
import { Telemetry } from "./Telemetry";

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));

vi.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: () => <div data-testid="vercel-speed-insights" />,
}));

describe("Telemetry", () => {
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
