import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";
import { BOSS_REROLL_COST, type VoucherId } from "../items/vouchers";

function grantVoucher(id: VoucherId): void {
  useGame.getState().setOwnedVoucherIds((prev) => {
    const next = new Set(prev);
    next.add(id);
    return next;
  });
}

describe("rerollBoss action", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setBlind(3);
    useGame.getState().setMoney(100);
  });

  test("returns false when no reroll voucher is owned", () => {
    expect(useGame.getState().rerollBoss()).toBe(false);
  });

  test("allows preview-rerolling the boss from non-boss blinds (Small/Big)", () => {
    grantVoucher("directors-cut");
    useGame.getState().setBlind(1);
    expect(useGame.getState().rerollBoss()).toBe(true);
  });

  test("returns false when player cannot afford the cost", () => {
    grantVoucher("directors-cut");
    useGame.getState().setMoney(BOSS_REROLL_COST - 1);
    expect(useGame.getState().rerollBoss()).toBe(false);
  });

  test("returns true with directors-cut and money on the boss blind", () => {
    grantVoucher("directors-cut");
    expect(useGame.getState().rerollBoss()).toBe(true);
  });

  test("deducts the boss reroll cost on a successful reroll", () => {
    grantVoucher("directors-cut");
    const before = useGame.getState().money;
    useGame.getState().rerollBoss();
    expect(useGame.getState().money).toBe(before - BOSS_REROLL_COST);
  });

  test("increments the per-ante usage counter on a successful reroll", () => {
    grantVoucher("directors-cut");
    useGame.getState().rerollBoss();
    expect(useGame.getState().bossRerollsUsedThisAnte).toBe(1);
  });

  test("directors-cut prevents a second reroll within the same ante", () => {
    grantVoucher("directors-cut");
    useGame.getState().rerollBoss();
    expect(useGame.getState().rerollBoss()).toBe(false);
  });

  test("retcon allows multiple rerolls within the same ante", () => {
    grantVoucher("directors-cut");
    grantVoucher("retcon");
    useGame.getState().rerollBoss();
    expect(useGame.getState().rerollBoss()).toBe(true);
  });

  test("replaces the current boss with a different one when the pool allows", () => {
    grantVoucher("directors-cut");
    useGame.getState().setAnte(8);
    const before = useGame.getState().currentBoss.id;
    useGame.getState().rerollBoss();
    expect(useGame.getState().currentBoss.id).not.toBe(before);
  });
});
