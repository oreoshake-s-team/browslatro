// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { fetchModelBytes, type DownloadProgress } from "./download";

function streamResponse(
  chunks: ReadonlyArray<Uint8Array>,
  total: number | null,
): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  const headers = new Headers();
  if (total !== null) headers.set("content-length", String(total));
  return new Response(body, { status: 200, headers });
}

function fetchReturning(response: Response): typeof fetch {
  return vi.fn().mockResolvedValue(response) as unknown as typeof fetch;
}

describe("fetchModelBytes", () => {
  test("returns the concatenated bytes from every chunk", async () => {
    const fetchFn = fetchReturning(
      streamResponse([new Uint8Array([1, 2]), new Uint8Array([3])], 3),
    );
    const bytes = await fetchModelBytes("/model.onnx", undefined, fetchFn);
    expect([...bytes]).toEqual([1, 2, 3]);
  });

  test("reports cumulative loaded bytes as chunks arrive", async () => {
    const events: DownloadProgress[] = [];
    const fetchFn = fetchReturning(
      streamResponse([new Uint8Array([1, 2]), new Uint8Array([3])], 3),
    );
    await fetchModelBytes("/model.onnx", (p) => events.push(p), fetchFn);
    expect(events.map((event) => event.loaded)).toEqual([2, 3]);
  });

  test("reports the total from the content-length header", async () => {
    const events: DownloadProgress[] = [];
    const fetchFn = fetchReturning(
      streamResponse([new Uint8Array([1, 2, 3])], 3),
    );
    await fetchModelBytes("/model.onnx", (p) => events.push(p), fetchFn);
    expect(events.at(-1)?.total).toBe(3);
  });

  test("reports a null total when content-length is absent", async () => {
    const events: DownloadProgress[] = [];
    const fetchFn = fetchReturning(
      streamResponse([new Uint8Array([1, 2, 3])], null),
    );
    await fetchModelBytes("/model.onnx", (p) => events.push(p), fetchFn);
    expect(events.at(-1)?.total).toBeNull();
  });

  test("rejects when the response is not ok", async () => {
    const fetchFn = fetchReturning(new Response(null, { status: 404 }));
    await expect(fetchModelBytes("/model.onnx", undefined, fetchFn)).rejects.toThrow(
      "model download failed: 404",
    );
  });
});
