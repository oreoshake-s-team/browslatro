import type { ComponentType } from "react";
import { act, render } from "@testing-library/react";
import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import * as preview from "../../.storybook/preview";

const annotations = setProjectAnnotations([preview]);

beforeAll(annotations.beforeAll);

type StoryModule = Parameters<typeof composeStories>[0];

const storyModules = import.meta.glob<StoryModule>("../**/*.stories.tsx", {
  eager: true,
});

const EXPECTED_BOUNDARY_ERROR = /chunk-demo\.js|<Boom>|LazyChunkErrorBoundary/;

function matchesExpectedBoundaryError(args: ReadonlyArray<unknown>): boolean {
  return args.some(
    (arg) =>
      (arg instanceof Error && EXPECTED_BOUNDARY_ERROR.test(arg.message)) ||
      (typeof arg === "string" && EXPECTED_BOUNDARY_ERROR.test(arg)),
  );
}

function silenceExpectedBoundaryErrors(): () => void {
  const original = console.error.bind(console);
  const spy = vi
    .spyOn(console, "error")
    .mockImplementation((...args: unknown[]) => {
      if (!matchesExpectedBoundaryError(args)) original(...args);
    });
  return () => spy.mockRestore();
}

async function settleSuspense(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("storybook stories", () => {
  test("discovers story modules", () => {
    expect(Object.keys(storyModules).length).toBeGreaterThan(0);
  });

  for (const [path, mod] of Object.entries(storyModules)) {
    describe(path.replace("../", "src/"), () => {
      const stories = composeStories(mod) as Record<string, ComponentType>;
      const expectsBoundaryError = path.includes(
        "LazyChunkErrorBoundary.stories",
      );
      for (const [name, Story] of Object.entries(stories)) {
        test(`${name} renders`, async () => {
          const restore = expectsBoundaryError
            ? silenceExpectedBoundaryErrors()
            : null;
          try {
            const { container } = render(<Story />);
            expect(container).toBeInTheDocument();
            await settleSuspense();
          } finally {
            restore?.();
          }
        });
      }
    });
  }
});
