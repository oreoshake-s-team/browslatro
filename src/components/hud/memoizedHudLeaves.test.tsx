import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Help from "./Help";
import RunProgress from "./RunProgress";
import RoundProgress from "./RoundProgress";
import RunInfo, { emptyHandCounts } from "./RunInfo";
import ScoringTraceButton from "./ScoringTraceButton";
import { createDefaultHandStats } from "../../scoring/handStats";
import type { ScoringEvent } from "../../scoring/scoringTrace";

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

const stableHandStats = createDefaultHandStats();
const stableHandCounts = emptyHandCounts();
const stableScoringEvents: ReadonlyArray<ScoringEvent> = [];

function Harness({ children }: { children: (tick: number) => React.ReactNode }) {
  const [tick, setTick] = useState(0);
  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>bump</button>
      {children(tick)}
    </div>
  );
}

async function bumpTwice(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "bump" }));
  await user.click(screen.getByRole("button", { name: "bump" }));
}

describe("HUD leaf memoization", () => {
  beforeEach(() => {
    useTranslationCalls.count = 0;
  });

  test("Help skips re-render when an unrelated ancestor state changes", async () => {
    render(<Harness>{() => <Help />}</Harness>);
    const rendersAfterMount = useTranslationCalls.count;
    await bumpTwice();
    expect(useTranslationCalls.count).toBe(rendersAfterMount);
  });

  test("RunProgress skips re-render when props are unchanged and an unrelated ancestor re-renders", async () => {
    render(<Harness>{() => <RunProgress ante={1} round={1} money={4} />}</Harness>);
    const rendersAfterMount = useTranslationCalls.count;
    await bumpTwice();
    expect(useTranslationCalls.count).toBe(rendersAfterMount);
  });

  test("RoundProgress skips re-render when props are unchanged and an unrelated ancestor re-renders", async () => {
    render(
      <Harness>
        {() => <RoundProgress remainingHands={4} remainingDiscards={3} />}
      </Harness>,
    );
    const rendersAfterMount = useTranslationCalls.count;
    await bumpTwice();
    expect(useTranslationCalls.count).toBe(rendersAfterMount);
  });

  test("RunInfo skips re-render when props are unchanged and an unrelated ancestor re-renders", async () => {
    render(
      <Harness>
        {() => (
          <RunInfo handPlayCounts={stableHandCounts} handStats={stableHandStats} />
        )}
      </Harness>,
    );
    const rendersAfterMount = useTranslationCalls.count;
    await bumpTwice();
    expect(useTranslationCalls.count).toBe(rendersAfterMount);
  });

  test("ScoringTraceButton skips re-render when props are unchanged and an unrelated ancestor re-renders", async () => {
    render(
      <Harness>
        {() => (
          <ScoringTraceButton events={stableScoringEvents} className="btn">
            Open
          </ScoringTraceButton>
        )}
      </Harness>,
    );
    const rendersAfterMount = useTranslationCalls.count;
    await bumpTwice();
    expect(useTranslationCalls.count).toBe(rendersAfterMount);
  });
});
