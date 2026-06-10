export function stripLeadingThe(name: string): string {
  return name.replace(/^the /i, "");
}

export function compareDisplayNames(a: string, b: string): number {
  return stripLeadingThe(a).localeCompare(stripLeadingThe(b));
}

export function sortByDisplayName<T>(
  items: ReadonlyArray<T>,
  name: (item: T) => string,
): ReadonlyArray<T> {
  return [...items].sort((a, b) => compareDisplayNames(name(a), name(b)));
}
