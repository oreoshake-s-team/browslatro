type ServiceWorkerHost = {
  serviceWorker?: Pick<ServiceWorkerContainer, "register">;
};

type RegisterDeps = {
  isProduction: boolean;
  host: ServiceWorkerHost | undefined;
  target: Pick<Window, "addEventListener"> | undefined;
};

function defaultDeps(): RegisterDeps {
  return {
    isProduction: import.meta.env.PROD,
    host: typeof navigator === "undefined" ? undefined : navigator,
    target: typeof window === "undefined" ? undefined : window,
  };
}

export const SERVICE_WORKER_URL = "/sw.js";

export function registerServiceWorker(
  deps: RegisterDeps = defaultDeps(),
): boolean {
  const { isProduction, host, target } = deps;
  if (!isProduction || !target || !host?.serviceWorker) return false;
  const container = host.serviceWorker;
  target.addEventListener("load", () => {
    void container.register(SERVICE_WORKER_URL);
  });
  return true;
}
