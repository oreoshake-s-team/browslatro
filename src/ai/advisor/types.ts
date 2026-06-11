import type { HandOption } from "../getHandOptions";
import type { ModelState } from "../modelState";

export const MAX_CANDIDATES = 12;
export const MAX_HAND_CARDS = 16;
export const MAX_JOKERS = 16;
export const MAX_CANDIDATE_CARDS = 5;
export const MAX_OWNED_VOUCHERS = 32;
export const MIN_CONTEXT_CANDIDATES = 2;

export interface HandAdviceRequest {
  readonly context?: undefined;
  readonly state: ModelState;
  readonly candidates: ReadonlyArray<HandOption>;
}

export interface NamedRef {
  readonly id: string;
  readonly name: string;
}

export interface ShopAdviceItem {
  readonly itemType: string;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
}

export type ShopAdviceCandidate =
  | { readonly action: "buy"; readonly item: ShopAdviceItem }
  | { readonly action: "reroll"; readonly cost: number }
  | { readonly action: "leave" };

export interface ShopAdviceState {
  readonly money: number;
  readonly ante: number;
  readonly jokers: ReadonlyArray<NamedRef>;
  readonly jokerCapacity: number;
  readonly consumables: ReadonlyArray<NamedRef>;
  readonly consumableCapacity: number;
  readonly ownedVoucherIds: ReadonlyArray<string>;
}

export interface ShopAdviceRequest {
  readonly context: "shop";
  readonly shop: ShopAdviceState;
  readonly candidates: ReadonlyArray<ShopAdviceCandidate>;
}

export interface PackAdviceOption {
  readonly optionType: string;
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export type PackAdviceCandidate =
  | { readonly action: "pick"; readonly option: PackAdviceOption }
  | { readonly action: "skip" };

export interface PackAdviceState {
  readonly pool: string;
  readonly variant: string;
  readonly picksRemaining: number;
  readonly money: number;
  readonly ante: number;
  readonly jokers: ReadonlyArray<NamedRef>;
  readonly jokerCapacity: number;
  readonly consumables: ReadonlyArray<NamedRef>;
  readonly consumableCapacity: number;
}

export interface PackAdviceRequest {
  readonly context: "pack";
  readonly pack: PackAdviceState;
  readonly candidates: ReadonlyArray<PackAdviceCandidate>;
}

export type AdviceRequest =
  | HandAdviceRequest
  | ShopAdviceRequest
  | PackAdviceRequest;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCardIdArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= MAX_CANDIDATE_CARDS &&
    value.every(isFiniteNumber)
  );
}

function isCandidate(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isCardIdArray(value.cardIds)) return false;
  if (value.action === "discard") return true;
  if (value.action !== "play") return false;
  return (
    typeof value.handLabel === "string" &&
    isFiniteNumber(value.score) &&
    isFiniteNumber(value.chips) &&
    isFiniteNumber(value.mult)
  );
}

function isModelState(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    !Array.isArray(value.hand) ||
    value.hand.length < 1 ||
    value.hand.length > MAX_HAND_CARDS ||
    !value.hand.every(isRecord)
  ) {
    return false;
  }
  if (
    !Array.isArray(value.jokers) ||
    value.jokers.length > MAX_JOKERS ||
    !value.jokers.every(isRecord)
  ) {
    return false;
  }
  if (
    !isRecord(value.blind) ||
    typeof value.blind.name !== "string" ||
    !isFiniteNumber(value.blind.scoreTarget)
  ) {
    return false;
  }
  return (
    isFiniteNumber(value.money) &&
    isFiniteNumber(value.remainingHands) &&
    isFiniteNumber(value.remainingDiscards) &&
    isFiniteNumber(value.roundScore)
  );
}

function isNamedRef(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}

function isNamedRefArray(value: unknown, max: number): boolean {
  return Array.isArray(value) && value.length <= max && value.every(isNamedRef);
}

function isShopItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.itemType === "string" &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    isFiniteNumber(value.cost)
  );
}

function isShopCandidate(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.action === "buy") return isShopItem(value.item);
  if (value.action === "reroll") return isFiniteNumber(value.cost);
  return value.action === "leave";
}

function isShopState(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isNamedRefArray(value.jokers, MAX_JOKERS)) return false;
  if (!isNamedRefArray(value.consumables, MAX_JOKERS)) return false;
  if (
    !Array.isArray(value.ownedVoucherIds) ||
    value.ownedVoucherIds.length > MAX_OWNED_VOUCHERS ||
    !value.ownedVoucherIds.every((id) => typeof id === "string")
  ) {
    return false;
  }
  return (
    isFiniteNumber(value.money) &&
    isFiniteNumber(value.ante) &&
    isFiniteNumber(value.jokerCapacity) &&
    isFiniteNumber(value.consumableCapacity)
  );
}

function isContextCandidates(
  value: unknown,
  isContextCandidate: (candidate: unknown) => boolean,
): boolean {
  return (
    Array.isArray(value) &&
    value.length >= MIN_CONTEXT_CANDIDATES &&
    value.length <= MAX_CANDIDATES &&
    value.every(isContextCandidate)
  );
}

function parseShopAdviceRequest(
  body: Record<string, unknown>,
): ShopAdviceRequest | null {
  if (!isShopState(body.shop)) return null;
  if (!isContextCandidates(body.candidates, isShopCandidate)) return null;
  return body as unknown as ShopAdviceRequest;
}

function isPackOption(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.optionType === "string" &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string"
  );
}

function isPackCandidate(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.action === "pick") return isPackOption(value.option);
  return value.action === "skip";
}

function isPackState(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.pool !== "string" || typeof value.variant !== "string") {
    return false;
  }
  if (!isNamedRefArray(value.jokers, MAX_JOKERS)) return false;
  if (!isNamedRefArray(value.consumables, MAX_JOKERS)) return false;
  return (
    isFiniteNumber(value.picksRemaining) &&
    isFiniteNumber(value.money) &&
    isFiniteNumber(value.ante) &&
    isFiniteNumber(value.jokerCapacity) &&
    isFiniteNumber(value.consumableCapacity)
  );
}

function parsePackAdviceRequest(
  body: Record<string, unknown>,
): PackAdviceRequest | null {
  if (!isPackState(body.pack)) return null;
  if (!isContextCandidates(body.candidates, isPackCandidate)) return null;
  return body as unknown as PackAdviceRequest;
}

export function parseAdviceRequest(body: unknown): AdviceRequest | null {
  if (!isRecord(body)) return null;
  if (body.context === "shop") return parseShopAdviceRequest(body);
  if (body.context === "pack") return parsePackAdviceRequest(body);
  if (body.context !== undefined) return null;
  if (!isModelState(body.state)) return null;
  if (!Array.isArray(body.candidates)) return null;
  if (body.candidates.length === 0 || body.candidates.length > MAX_CANDIDATES) {
    return null;
  }
  if (!body.candidates.every(isCandidate)) return null;
  return body as unknown as AdviceRequest;
}
