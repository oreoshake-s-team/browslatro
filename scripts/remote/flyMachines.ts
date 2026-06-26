export interface MachineGuest {
  readonly cpus: number;
  readonly memoryMb: number;
  readonly cpuKind?: "shared" | "performance";
}

export interface MachineRunSpec {
  readonly name?: string;
  readonly image: string;
  readonly env: Record<string, string>;
  readonly guest: MachineGuest;
  readonly exec?: readonly string[];
}

export interface MachineHandle {
  readonly id: string;
  readonly state: string;
}

export interface MachineLauncher {
  run(spec: MachineRunSpec): Promise<MachineHandle>;
  get(id: string): Promise<MachineHandle>;
  destroy(id: string): Promise<void>;
}

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

export interface FlyMachinesClientOptions {
  readonly app: string;
  readonly token: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: FetchImpl;
}

interface FlyMachineResponse {
  readonly id: string;
  readonly state: string;
}

export class FlyMachinesClient implements MachineLauncher {
  private readonly app: string;
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchImpl;

  constructor(options: FlyMachinesClientOptions) {
    this.app = options.app;
    this.token = options.token;
    this.baseUrl = (options.baseUrl ?? "https://api.machines.dev/v1").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private url(path: string): string {
    return `${this.baseUrl}/apps/${this.app}/machines${path}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "content-type": "application/json",
    };
  }

  async run(spec: MachineRunSpec): Promise<MachineHandle> {
    const body = {
      name: spec.name,
      config: {
        image: spec.image,
        env: spec.env,
        auto_destroy: true,
        restart: { policy: "no" },
        guest: {
          cpus: spec.guest.cpus,
          memory_mb: spec.guest.memoryMb,
          cpu_kind: spec.guest.cpuKind ?? "shared",
        },
        ...(spec.exec !== undefined ? { init: { exec: spec.exec } } : {}),
      },
    };
    const res = await this.fetchImpl(this.url(""), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Fly machine run failed: ${res.status} ${await res.text()}`);
    }
    const machine = (await res.json()) as FlyMachineResponse;
    return { id: machine.id, state: machine.state };
  }

  async get(id: string): Promise<MachineHandle> {
    const res = await this.fetchImpl(this.url(`/${id}`), {
      method: "GET",
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`Fly machine get ${id} failed: ${res.status}`);
    }
    const machine = (await res.json()) as FlyMachineResponse;
    return { id: machine.id, state: machine.state };
  }

  async destroy(id: string): Promise<void> {
    const res = await this.fetchImpl(this.url(`/${id}?force=true`), {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Fly machine destroy ${id} failed: ${res.status}`);
    }
  }
}
