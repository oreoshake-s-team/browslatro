// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { FlyLogsClient } from "./flyLogs";

interface Recorded {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

function clientWith(response: unknown, status = 200): { client: FlyLogsClient; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    return new Response(JSON.stringify(response), { status });
  });
  const client = new FlyLogsClient({
    app: "browslatro-dataset",
    token: "tok",
    fetchImpl,
  });
  return { client, calls };
}

function entry(message: string): { attributes: { message: string } } {
  return { attributes: { message } };
}

describe("FlyLogsClient.poll", () => {
  test("polls the app logs endpoint filtered to the machine", async () => {
    const { client, calls } = clientWith({ data: [], meta: {} });
    await client.poll("m1", "");
    expect(calls[0].url).toBe(
      "https://api.fly.io/api/v1/apps/browslatro-dataset/logs?instance=m1",
    );
  });

  test("authenticates with the Fly API token", async () => {
    const { client, calls } = clientWith({ data: [], meta: {} });
    await client.poll("m1", "");
    expect(calls[0].init?.headers).toEqual({ Authorization: "Bearer tok" });
  });

  test("omits the cursor on the first poll", async () => {
    const { client, calls } = clientWith({ data: [], meta: {} });
    await client.poll("m1", "");
    expect(calls[0].url).not.toContain("next_token");
  });

  test("passes the cursor on subsequent polls", async () => {
    const { client, calls } = clientWith({ data: [], meta: {} });
    await client.poll("m1", "1779235200000000000");
    expect(calls[0].url).toContain("next_token=1779235200000000000");
  });

  test("returns the log messages in order", async () => {
    const { client } = clientWith({
      data: [entry("epoch 1/30"), entry("epoch 2/30")],
      meta: { next_token: "t2" },
    });
    const result = await client.poll("m1", "");
    expect(result.lines).toEqual(["epoch 1/30", "epoch 2/30"]);
  });

  test("advances the cursor from the response meta", async () => {
    const { client } = clientWith({ data: [], meta: { next_token: "t9" } });
    const result = await client.poll("m1", "t8");
    expect(result.nextToken).toBe("t9");
  });

  test("keeps the previous cursor when the response has none", async () => {
    const { client } = clientWith({ data: [], meta: {} });
    const result = await client.poll("m1", "t8");
    expect(result.nextToken).toBe("t8");
  });

  test("keeps the previous cursor when the response token is null", async () => {
    const { client } = clientWith({ data: [], meta: { next_token: null } });
    const result = await client.poll("m1", "t8");
    expect(result.nextToken).toBe("t8");
  });

  test("drops entries without a message", async () => {
    const { client } = clientWith({
      data: [{ attributes: {} }, entry("epoch 1/30")],
      meta: {},
    });
    const result = await client.poll("m1", "");
    expect(result.lines).toEqual(["epoch 1/30"]);
  });

  test("tolerates a response without a data array", async () => {
    const { client } = clientWith({ meta: {} });
    const result = await client.poll("m1", "");
    expect(result.lines).toEqual([]);
  });

  test("throws on a non-ok response", async () => {
    const { client } = clientWith({ error: "nope" }, 503);
    await expect(client.poll("m1", "")).rejects.toThrow(/Fly logs poll for machine m1 failed: 503/);
  });
});
