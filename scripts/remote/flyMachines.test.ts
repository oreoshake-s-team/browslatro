// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { FlyMachinesClient } from "./flyMachines";

interface Recorded {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

function clientWith(response: unknown, status = 200): { client: FlyMachinesClient; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    return new Response(JSON.stringify(response), { status });
  });
  const client = new FlyMachinesClient({
    app: "browslatro-dataset",
    token: "tok",
    fetchImpl,
  });
  return { client, calls };
}

describe("FlyMachinesClient.run", () => {
  test("posts to the app machines endpoint", async () => {
    const { client, calls } = clientWith({ id: "m1", state: "created" });
    await client.run({ image: "img", env: {}, guest: { cpus: 4, memoryMb: 2048 } });
    expect(calls[0].url).toBe("https://api.machines.dev/v1/apps/browslatro-dataset/machines");
  });

  test("sends a no-restart auto-destroy config", async () => {
    const { client, calls } = clientWith({ id: "m1", state: "created" });
    await client.run({ image: "img", env: { A: "1" }, guest: { cpus: 2, memoryMb: 1024 } });
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.config).toMatchObject({
      auto_destroy: true,
      restart: { policy: "no" },
      guest: { cpus: 2, memory_mb: 1024, cpu_kind: "shared" },
    });
  });

  test("returns the parsed machine handle", async () => {
    const { client } = clientWith({ id: "m1", state: "created" });
    const handle = await client.run({ image: "img", env: {}, guest: { cpus: 1, memoryMb: 256 } });
    expect(handle).toEqual({ id: "m1", state: "created" });
  });

  test("overrides the image command when exec is supplied", async () => {
    const { client, calls } = clientWith({ id: "m1", state: "created" });
    await client.run({
      image: "img",
      env: {},
      guest: { cpus: 1, memoryMb: 256 },
      exec: ["bash", "run.sh"],
    });
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.config.init).toEqual({ exec: ["bash", "run.sh"] });
  });

  test("omits init when no exec is supplied", async () => {
    const { client, calls } = clientWith({ id: "m1", state: "created" });
    await client.run({ image: "img", env: {}, guest: { cpus: 1, memoryMb: 256 } });
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.config.init).toBeUndefined();
  });

  test("throws on a non-ok response", async () => {
    const { client } = clientWith({ error: "nope" }, 422);
    await expect(
      client.run({ image: "img", env: {}, guest: { cpus: 1, memoryMb: 256 } }),
    ).rejects.toThrow(/Fly machine run failed: 422/);
  });
});

describe("FlyMachinesClient.get", () => {
  test("reads machine state by id", async () => {
    const { client } = clientWith({ id: "m1", state: "stopped" });
    const handle = await client.get("m1");
    expect(handle.state).toBe("stopped");
  });
});

describe("FlyMachinesClient.destroy", () => {
  test("force-deletes the machine", async () => {
    const { client, calls } = clientWith({});
    await client.destroy("m1");
    expect(calls[0].url).toBe("https://api.machines.dev/v1/apps/browslatro-dataset/machines/m1?force=true");
  });

  test("tolerates a 404", async () => {
    const { client } = clientWith({}, 404);
    await expect(client.destroy("gone")).resolves.toBeUndefined();
  });
});
