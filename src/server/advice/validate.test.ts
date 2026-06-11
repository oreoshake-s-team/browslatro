import { describe, expect, it } from "vitest";
import { validAdviceBody, type JsonRecord } from "./test-helpers";
import { MAX_OPTIONS, parseAdviceRequest } from "./validate";

function state(body: JsonRecord): JsonRecord {
  return body.state as JsonRecord;
}

function options(body: JsonRecord): JsonRecord[] {
  return body.options as JsonRecord[];
}

describe("parseAdviceRequest", () => {
  it("accepts a valid payload", () => {
    expect(parseAdviceRequest(validAdviceBody()).ok).toBe(true);
  });

  it("rejects a non-object body", () => {
    expect(parseAdviceRequest("nope").ok).toBe(false);
  });

  it("rejects a missing state", () => {
    const body = validAdviceBody();
    delete body.state;
    expect(parseAdviceRequest(body).ok).toBe(false);
  });

  it("rejects an empty hand", () => {
    const body = validAdviceBody();
    state(body).hand = [];
    expect(parseAdviceRequest(body).ok).toBe(false);
  });

  it("rejects an oversized hand", () => {
    const body = validAdviceBody();
    state(body).hand = Array.from({ length: 17 }, (_, id) => ({ id }));
    expect(parseAdviceRequest(body).ok).toBe(false);
  });

  it("rejects non-numeric money", () => {
    const body = validAdviceBody();
    state(body).money = "4";
    expect(parseAdviceRequest(body).ok).toBe(false);
  });

  it("rejects a blind without a score target", () => {
    const body = validAdviceBody();
    state(body).blind = { kind: "small", name: "Small Blind" };
    expect(parseAdviceRequest(body).ok).toBe(false);
  });

  it("rejects empty options", () => {
    const body = validAdviceBody();
    body.options = [];
    expect(parseAdviceRequest(body).ok).toBe(false);
  });

  it("rejects too many options", () => {
    const body = validAdviceBody();
    const play = options(body)[0];
    body.options = Array.from({ length: MAX_OPTIONS + 1 }, () => ({ ...play }));
    expect(parseAdviceRequest(body).ok).toBe(false);
  });

  it("rejects a play option without a score", () => {
    const body = validAdviceBody();
    delete options(body)[0].score;
    expect(parseAdviceRequest(body).ok).toBe(false);
  });

  it("rejects an option with an unknown action", () => {
    const body = validAdviceBody();
    options(body)[0].action = "fold";
    expect(parseAdviceRequest(body).ok).toBe(false);
  });

  it("rejects an option with more than five cards", () => {
    const body = validAdviceBody();
    options(body)[1].cardIds = [1, 2, 3, 4, 5, 6];
    expect(parseAdviceRequest(body).ok).toBe(false);
  });

  it("rejects an option with no cards", () => {
    const body = validAdviceBody();
    options(body)[1].cardIds = [];
    expect(parseAdviceRequest(body).ok).toBe(false);
  });
});
