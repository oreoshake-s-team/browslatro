type ServiceWorkerHost = {
  serviceWorker?: Pick<
    ServiceWorkerContainer,
    "register" | "addEventListener" | "controller"
  >;
};

type RegisterDeps = {
  isProduction: boolean;
  host: ServiceWorkerHost | undefined;
  target: Pick<Window, "addEventListener"> | undefined;
  reload?: () => void;
};

function defaultDeps(): RegisterDeps {
  return {
    isProduction: import.meta.env.PROD,
    host: typeof navigator === "undefined" ? undefined : navigator,
    target: typeof window === "undefined" ? undefined : window,
    reload: () => window.location.reload(),
  };
}

export const SERVICE_WORKER_URL = "/sw.js";

export function registerServiceWorker(
  deps: RegisterDeps = defaultDeps(),
): boolean {
  const { isProduction, host, target, reload } = deps;
  if (!isProduction || !target || !host?.serviceWorker) return false;
  const container = host.serviceWorker;
  const wasControlled = Boolean(container.controller);
  if (wasControlled && reload) {
    let reloaded = false;
    container.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      reload();
    });
  }
  target.addEventListener("load", () => {
    void container.register(SERVICE_WORKER_URL);
  });
  return true;
}
