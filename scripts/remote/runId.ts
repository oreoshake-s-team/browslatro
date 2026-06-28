function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatRunId(date: Date): string {
  const day = [date.getUTCFullYear(), pad(date.getUTCMonth() + 1), pad(date.getUTCDate())].join("-");
  const time = [pad(date.getUTCHours()), pad(date.getUTCMinutes()), pad(date.getUTCSeconds())].join("");
  return `${day}-${time}`;
}

export function resolveRunId(flag: string, now: Date = new Date()): string {
  return flag === "" ? formatRunId(now) : flag;
}
