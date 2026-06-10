import type { ComponentType } from "react";
import { render } from "@testing-library/react";
import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import * as preview from "../../.storybook/preview";

const annotations = setProjectAnnotations([preview]);

beforeAll(annotations.beforeAll);

type StoryModule = Parameters<typeof composeStories>[0];

const storyModules = import.meta.glob<StoryModule>("../**/*.stories.tsx", {
  eager: true,
});

describe("storybook stories", () => {
  test("discovers story modules", () => {
    expect(Object.keys(storyModules).length).toBeGreaterThan(0);
  });

  for (const [path, mod] of Object.entries(storyModules)) {
    describe(path.replace("../", "src/"), () => {
      const stories = composeStories(mod) as Record<string, ComponentType>;
      for (const [name, Story] of Object.entries(stories)) {
        test(`${name} renders`, () => {
          const { container } = render(<Story />);
          expect(container).toBeInTheDocument();
        });
      }
    });
  }
});
