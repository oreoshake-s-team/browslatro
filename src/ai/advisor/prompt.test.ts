// @vitest-environment node
import { describe, expect, test } from "vitest";
import { ADVISOR_SYSTEM_PROMPT, buildAdvicePrompt } from "./prompt";
import { adviceRequestFixture } from "./test-helpers";

describe("buildAdvicePrompt", () => {
  test("includes the serialized game state", () => {
    const prompt = buildAdvicePrompt(adviceRequestFixture());
    expect(prompt).toContain(JSON.stringify(adviceRequestFixture().state));
  });

  test("includes the serialized candidates", () => {
    const prompt = buildAdvicePrompt(adviceRequestFixture());
    expect(prompt).toContain(JSON.stringify(adviceRequestFixture().candidates));
  });

  test("tells the model candidates are zero-indexed", () => {
    expect(buildAdvicePrompt(adviceRequestFixture())).toContain(
      "indexed from zero",
    );
  });
});

describe("ADVISOR_SYSTEM_PROMPT", () => {
  test("forbids inventing numbers", () => {
    expect(ADVISOR_SYSTEM_PROMPT).toContain("Never invent");
  });
});
