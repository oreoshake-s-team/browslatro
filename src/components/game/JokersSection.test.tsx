import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JokersSection from "./JokersSection";
import { useGame } from "../../store/game";

const useTranslationCalls = { count: 0 };

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: (...args: Parameters<typeof actual.useTranslation>) => {
      useTranslationCalls.count++;
      return actual.useTranslation(...args);
    },
  };
});

function JokersSectionMemoHarness() {
  const [, setTick] = useState(0);
  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>bump</button>
      <JokersSection />
    </div>
  );
}

beforeEach(() => {
  useGame.getState().resetGame();
  useTranslationCalls.count = 0;
});

describe("JokersSection memoization", () => {
  test("skips re-render when an unrelated ancestor re-renders (zero own props)", async () => {
    render(<JokersSectionMemoHarness />);
    const rendersAfterMount = useTranslationCalls.count;
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "bump" }));
    await user.click(screen.getByRole("button", { name: "bump" }));
    expect(useTranslationCalls.count).toBe(rendersAfterMount);
  });
});
