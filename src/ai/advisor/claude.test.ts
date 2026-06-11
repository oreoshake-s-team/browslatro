// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { adviceRequestFixture } from "./test-helpers";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

import { DEFAULT_ADVISOR_MODEL, requestAdviceText } from "./claude";

function textResponse(text: string): unknown {
  return { stop_reason: "end_turn", content: [{ type: "text", text }] };
}

afterEach(() => {
  createMock.mockReset();
  vi.unstubAllEnvs();
});

describe("requestAdviceText", () => {
  test("returns the text of the model response", async () => {
    createMock.mockResolvedValue(textResponse('{"ok":true}'));
    const result = await requestAdviceText(adviceRequestFixture(), "sk-test");
    expect(result).toEqual({ kind: "text", text: '{"ok":true}' });
  });

  test("joins multiple text blocks", async () => {
    createMock.mockResolvedValue({
      stop_reason: "end_turn",
      content: [
        { type: "text", text: '{"a"' },
        { type: "text", text: ":1}" },
      ],
    });
    const result = await requestAdviceText(adviceRequestFixture(), "sk-test");
    expect(result).toEqual({ kind: "text", text: '{"a":1}' });
  });

  test("reports refusals", async () => {
    createMock.mockResolvedValue({ stop_reason: "refusal", content: [] });
    const result = await requestAdviceText(adviceRequestFixture(), "sk-test");
    expect(result).toEqual({ kind: "refusal" });
  });

  test("requests a json schema constrained response", async () => {
    createMock.mockResolvedValue(textResponse("{}"));
    await requestAdviceText(adviceRequestFixture(), "sk-test");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        output_config: expect.objectContaining({
          format: expect.objectContaining({ type: "json_schema" }),
        }),
      }),
    );
  });

  test("defaults to the opus advisor model", async () => {
    createMock.mockResolvedValue(textResponse("{}"));
    await requestAdviceText(adviceRequestFixture(), "sk-test");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: DEFAULT_ADVISOR_MODEL }),
    );
  });

  test("honors the ADVISOR_MODEL override", async () => {
    vi.stubEnv("ADVISOR_MODEL", "claude-haiku-4-5");
    createMock.mockResolvedValue(textResponse("{}"));
    await requestAdviceText(adviceRequestFixture(), "sk-test");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-haiku-4-5" }),
    );
  });
});
