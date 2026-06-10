import {
  registerServiceWorker,
  SERVICE_WORKER_URL,
} from "./registerServiceWorker";

type LoadListener = () => void;

function fakeTarget() {
  const listeners: LoadListener[] = [];
  return {
    target: {
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        if (typeof listener === "function") {
          listeners.push(() => listener(new Event("load")));
        }
      },
    } as Pick<Window, "addEventListener">,
    fireLoad: () => listeners.forEach((listener) => listener()),
  };
}

function fakeHost() {
  const register = vi.fn(() => Promise.resolve(undefined as unknown as ServiceWorkerRegistration));
  return {
    host: { serviceWorker: { register } },
    register,
  };
}

describe("registerServiceWorker", () => {
  test("returns false outside production builds", () => {
    const { host } = fakeHost();
    const { target } = fakeTarget();
    expect(registerServiceWorker({ isProduction: false, host, target })).toBe(
      false,
    );
  });

  test("does not register outside production builds", () => {
    const { host, register } = fakeHost();
    const { target, fireLoad } = fakeTarget();
    registerServiceWorker({ isProduction: false, host, target });
    fireLoad();
    expect(register).not.toHaveBeenCalled();
  });

  test("returns false without a window", () => {
    const { host } = fakeHost();
    expect(
      registerServiceWorker({ isProduction: true, host, target: undefined }),
    ).toBe(false);
  });

  test("returns false without a navigator", () => {
    const { target } = fakeTarget();
    expect(
      registerServiceWorker({ isProduction: true, host: undefined, target }),
    ).toBe(false);
  });

  test("returns false when service workers are unsupported", () => {
    const { target } = fakeTarget();
    expect(registerServiceWorker({ isProduction: true, host: {}, target })).toBe(
      false,
    );
  });

  test("returns true in production with service worker support", () => {
    const { host } = fakeHost();
    const { target } = fakeTarget();
    expect(registerServiceWorker({ isProduction: true, host, target })).toBe(
      true,
    );
  });

  test("does not register before the window load event", () => {
    const { host, register } = fakeHost();
    const { target } = fakeTarget();
    registerServiceWorker({ isProduction: true, host, target });
    expect(register).not.toHaveBeenCalled();
  });

  test("registers the service worker script on window load", () => {
    const { host, register } = fakeHost();
    const { target, fireLoad } = fakeTarget();
    registerServiceWorker({ isProduction: true, host, target });
    fireLoad();
    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_URL);
  });
});
