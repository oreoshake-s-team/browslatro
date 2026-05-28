import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { tarotRngConfig } from "./items/tarots";
import { forceShopLayout, shopPickerRngConfig } from "./items/shop";
import { initialJokersConfig, createPlusFourMultJoker } from "./items/jokers";
import {
  findShopOfferIdxOfKind,
  setupAppTestEnvironment,
} from "./App.test-helpers";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

vi.mock("./items/tarots", async () => {
  const actual =
    await vi.importActual<typeof import("./items/tarots")>("./items/tarots");
  const wheel = actual
    .createTarotCatalog()
    .find((t) => t.id === "wheel-of-fortune");
  return {
    ...actual,
    createTarotCatalog: () => (wheel ? [wheel] : []),
  };
});

const HIT_RNG = () => 0;
const MISS_RNG = () => 0.99;

setupAppTestEnvironment();

const originalJokerFactory = initialJokersConfig.factory;

afterEach(() => {
  initialJokersConfig.factory = originalJokerFactory;
});

async function buyWheelOfFortuneConsumable(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  shopPickerRngConfig.rng = forceShopLayout(["tarot", "joker"]);
  await user.click(screen.getByText(/^🏆 Win$/));
  const idx = findShopOfferIdxOfKind("tarot");
  const buy = screen
    .getByTestId(`shop-offer-${idx}`)
    .querySelector("button.shop-offer-buy");
  if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy button");
  await user.click(buy);
}

describe("Wheel of Fortune nope animation — consumable-use path", () => {
  test("plays the nope animation when the edition roll misses", async () => {
    initialJokersConfig.factory = () => [createPlusFourMultJoker()];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await buyWheelOfFortuneConsumable(user);
    tarotRngConfig.rng = MISS_RNG;
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(screen.getByTestId("nope-animation")).toBeInTheDocument();
  });

  test("plays the nope animation when there is no joker to target", async () => {
    initialJokersConfig.factory = () => [];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await buyWheelOfFortuneConsumable(user);
    tarotRngConfig.rng = HIT_RNG;
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(screen.getByTestId("nope-animation")).toBeInTheDocument();
  });

  test("does not play the nope animation on a successful apply", async () => {
    initialJokersConfig.factory = () => [createPlusFourMultJoker()];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await buyWheelOfFortuneConsumable(user);
    tarotRngConfig.rng = HIT_RNG;
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(screen.queryByTestId("nope-animation")).not.toBeInTheDocument();
  });
});

describe("Wheel of Fortune nope animation — pack-opening path", () => {
  async function openArcanaPackWithWheelOfFortune(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await user.click(screen.getByRole("button", { name: /Add Arcana pack/ }));
    await user.click(screen.getByText(/^🏆 Win$/));
    const arcanaOffer = document.querySelector('[data-pack-pool="arcana"]');
    if (!arcanaOffer) throw new Error("no arcana pack offer");
    const open = arcanaOffer.querySelector("button.shop-offer-buy");
    if (!(open instanceof HTMLButtonElement)) throw new Error("missing open");
    await user.click(open);
  }

  test("plays the nope animation when the edition roll misses", async () => {
    initialJokersConfig.factory = () => [createPlusFourMultJoker()];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await openArcanaPackWithWheelOfFortune(user);
    tarotRngConfig.rng = MISS_RNG;
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(screen.getByTestId("nope-animation")).toBeInTheDocument();
  });

  test("plays the nope animation when there is no joker to target", async () => {
    initialJokersConfig.factory = () => [];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await openArcanaPackWithWheelOfFortune(user);
    tarotRngConfig.rng = HIT_RNG;
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(screen.getByTestId("nope-animation")).toBeInTheDocument();
  });

  test("does not play the nope animation on a successful apply", async () => {
    initialJokersConfig.factory = () => [createPlusFourMultJoker()];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await openArcanaPackWithWheelOfFortune(user);
    tarotRngConfig.rng = HIT_RNG;
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(screen.queryByTestId("nope-animation")).not.toBeInTheDocument();
  });
});
