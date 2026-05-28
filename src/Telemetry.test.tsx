import { render, screen } from "@testing-library/react";
import { Telemetry } from "./Telemetry";

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));

vi.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: () => <div data-testid="vercel-speed-insights" />,
}));

describe("Telemetry", () => {
  it("renders Vercel Analytics", () => {
    render(<Telemetry />);
    expect(screen.getByTestId("vercel-analytics")).toBeInTheDocument();
  });

  it("renders Vercel Speed Insights", () => {
    render(<Telemetry />);
    expect(screen.getByTestId("vercel-speed-insights")).toBeInTheDocument();
  });

  it("renders no visible UI", () => {
    const { container } = render(<Telemetry />);
    expect(container).not.toHaveTextContent(/\S/);
  });
});
