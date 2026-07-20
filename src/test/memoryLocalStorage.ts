function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length(): number {
      return store.size;
    },
    clear(): void {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
  };
}

// Avoid triggering Node's experimental localStorage getter (which warns) by
// inspecting property descriptors instead of reading globalThis.localStorage.
function ensureMemoryLocalStorageOn(target: object): void {
  const desc = Object.getOwnPropertyDescriptor(target, "localStorage");
  // If there's no own property or it's an accessor (getter/setter), override with a memory storage.
  if (!desc || typeof desc.get === "function" || typeof desc.set === "function") {
    Object.defineProperty(target, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
    return;
  }
  // If there's a plain value but it isn't a functional Storage, replace it.
  const current = desc.value as unknown;
  const functional =
    !!current &&
    typeof (current as Storage).setItem === "function" &&
    typeof (current as Storage).getItem === "function";
  if (!functional) {
    Object.defineProperty(target, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
}

// Define a window alias if missing first, then ensure both global and window have memory-backed storage.
if (!Object.getOwnPropertyDescriptor(globalThis, "window")) {
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
    writable: true,
  });
}

ensureMemoryLocalStorageOn(globalThis);
ensureMemoryLocalStorageOn(window);
