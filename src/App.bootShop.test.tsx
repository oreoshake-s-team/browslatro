import { render, screen } from "@testing-library/react";
import App from "./App";
import { getStatValue, setupAppTestEnvironment } from "./App.test-helpers";
import { _resetBootShopForTests } from "./dev/bootShop";
import { useGame } from "./store/game";

setupAppTestEnvironment();

describe("bootShop seam boots the app into the shop (#940)", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    _resetBootShopForTests();
    window.localStorage.removeItem("browslatro:bootShop");
  });

  afterEach(() => {
    window.localStorage.removeItem("browslatro:bootShop");
  });

  test("with browslatro:bootShop=1 the app mounts into the shop with the played-round wallet and no run/blind select", async () => {
    window.localStorage.setItem("browslatro:bootShop", "1");
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: /Shop/ }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("new-run-confirm")).not.toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$10");
  });

  test("without the flag the app mounts into the New Run screen (negative)", () => {
    render(<App />);
    expect(
      screen.queryByRole("heading", { name: /Shop/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("new-run-confirm")).toBeInTheDocument();
  });
});
