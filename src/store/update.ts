export type Updater<T> = T | ((prev: T) => T);

export function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function" ? (update as (p: T) => T)(prev) : update;
}
