export function idolDescriptionText(
  base: string,
  rankName: string | null,
  suitName: string | null,
): string {
  if (rankName === null || suitName === null) return base;
  return base.replace("[rank]", rankName).replace("[suit]", suitName);
}
