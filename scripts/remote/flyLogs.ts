export interface LogPollResult {
  readonly lines: readonly string[];
  readonly nextToken: string;
}

export interface LogSource {
  poll(machineId: string, nextToken: string): Promise<LogPollResult>;
}

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

export interface FlyLogsClientOptions {
  readonly app: string;
  readonly token: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: FetchImpl;
}

interface FlyLogEntry {
  readonly attributes?: {
    readonly message?: string;
  };
}

interface FlyLogsResponse {
  readonly data?: readonly FlyLogEntry[];
  readonly meta?: {
    readonly next_token?: string | null;
  };
}

export class FlyLogsClient implements LogSource {
  private readonly app: string;
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchImpl;

  constructor(options: FlyLogsClientOptions) {
    this.app = options.app;
    this.token = options.token;
    this.baseUrl = (options.baseUrl ?? "https://api.fly.io").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  async poll(machineId: string, nextToken: string): Promise<LogPollResult> {
    const params = new URLSearchParams({ instance: machineId });
    if (nextToken !== "") {
      params.set("next_token", nextToken);
    }
    const res = await this.fetchImpl(
      `${this.baseUrl}/api/v1/apps/${this.app}/logs?${params.toString()}`,
      { method: "GET", headers: { Authorization: `Bearer ${this.token}` } },
    );
    if (!res.ok) {
      throw new Error(`Fly logs poll for machine ${machineId} failed: ${res.status}`);
    }
    const body = (await res.json()) as FlyLogsResponse;
    const lines = (body.data ?? [])
      .map((entry) => entry.attributes?.message ?? "")
      .filter((message) => message !== "");
    const token = body.meta?.next_token;
    return { lines, nextToken: token === undefined || token === null ? nextToken : token };
  }
}
