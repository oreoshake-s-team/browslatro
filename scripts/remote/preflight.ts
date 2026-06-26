export interface PreflightDeps {
  readonly putMarker: (key: string, body: Buffer) => Promise<void>;
  readonly checkFly: () => Promise<void>;
  readonly log?: (message: string) => void;
}

export async function runPreflight(runId: string, deps: PreflightDeps): Promise<void> {
  const log = deps.log ?? (() => {});
  const checks: { readonly name: string; readonly run: () => Promise<void> }[] = [
    { name: "Fly app reachable", run: deps.checkFly },
    {
      name: "S3 bucket writable",
      run: () => deps.putMarker(`preflight/${runId}.marker`, Buffer.from("ok")),
    },
  ];

  const failures: string[] = [];
  for (const check of checks) {
    try {
      await check.run();
      log(`preflight: ${check.name} ok`);
    } catch (error) {
      failures.push(`${check.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `preflight failed before launching any machine:\n  - ${failures.join("\n  - ")}`,
    );
  }
}
