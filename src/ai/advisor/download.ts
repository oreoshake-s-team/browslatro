export interface DownloadProgress {
  readonly loaded: number;
  readonly total: number | null;
}

export type DownloadProgressListener = (progress: DownloadProgress) => void;

function concatChunks(chunks: ReadonlyArray<Uint8Array>, length: number): Uint8Array {
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function fetchModelBytes(
  url: string,
  onProgress?: DownloadProgressListener,
  fetchFn: typeof fetch = fetch,
): Promise<Uint8Array> {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`model download failed: ${response.status}`);
  }
  const header = response.headers.get("content-length");
  const total = header !== null && header !== "" ? Number(header) : null;
  if (response.body === null) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onProgress?.({ loaded: bytes.length, total: total ?? bytes.length });
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.({ loaded, total });
  }
  return concatChunks(chunks, loaded);
}
