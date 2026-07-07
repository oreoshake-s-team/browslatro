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

function isFunctionalStorage(candidate: unknown): candidate is Storage {
  try {
    const storage = candidate as Storage | null | undefined;
    if (!storage || typeof storage.setItem !== "function") return false;
    const probe = "__memoryLocalStorage_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const globalScope = globalThis as unknown as {
  localStorage?: Storage;
  window?: { localStorage?: Storage };
};

if (!isFunctionalStorage(globalScope.localStorage)) {
  Object.defineProperty(globalThis, "localStorage", {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}

const windowScope = globalScope.window;
if (windowScope === undefined) {
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
    writable: true,
  });
} else if (
  windowScope !== (globalThis as unknown) &&
  !isFunctionalStorage(windowScope.localStorage)
) {
  Object.defineProperty(windowScope, "localStorage", {
    value: globalScope.localStorage,
    configurable: true,
    writable: true,
  });
}
