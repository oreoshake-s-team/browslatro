export const SCHEMA_VERSION = 1 as const;

export interface SerializedRun {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly exportedAt: string;
  readonly state: Record<string, unknown>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encode(value: unknown): unknown {
  if (typeof value === "function") return undefined;
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Set) {
    return {
      __type: "Set",
      values: [...value].map(encode),
    };
  }
  if (value instanceof Map) {
    return {
      __type: "Map",
      entries: [...value].map(([k, v]) => [encode(k), encode(v)]),
    };
  }
  if (Array.isArray(value)) return value.map(encode);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    const encoded = encode(v);
    if (encoded !== undefined) out[k] = encoded;
  }
  return out;
}

function decode(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(decode);
  const obj = value as Record<string, unknown>;
  if (obj.__type === "Set" && Array.isArray(obj.values)) {
    return new Set((obj.values as ReadonlyArray<unknown>).map(decode));
  }
  if (obj.__type === "Map" && Array.isArray(obj.entries)) {
    const entries = obj.entries as ReadonlyArray<readonly [unknown, unknown]>;
    return new Map(entries.map(([k, v]) => [decode(k), decode(v)]));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = decode(v);
  return out;
}

export function serializeRun(state: object): SerializedRun {
  const encoded = encode(state);
  if (!isPlainRecord(encoded)) {
    throw new Error("serializeRun: top-level state must serialize to an object");
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state: encoded,
  };
}

export function deserializeRun(snapshot: SerializedRun): Record<string, unknown> {
  if (snapshot.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported snapshot schemaVersion: ${snapshot.schemaVersion}`,
    );
  }
  const decoded = decode(snapshot.state);
  if (!isPlainRecord(decoded)) {
    throw new Error("deserializeRun: state decode produced a non-object");
  }
  return decoded;
}

export function isSerializedRun(value: unknown): value is SerializedRun {
  if (!isPlainRecord(value)) return false;
  return (
    value.schemaVersion === SCHEMA_VERSION &&
    typeof value.exportedAt === "string" &&
    isPlainRecord(value.state)
  );
}
