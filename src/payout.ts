export const INTEREST_RATE_PER = 5;
export const INTEREST_CAP = 5;

export function calculateInterest(wallet: number): number {
  if (wallet <= 0) return 0;
  const raw = Math.floor(wallet / INTEREST_RATE_PER);
  return Math.min(raw, INTEREST_CAP);
}
