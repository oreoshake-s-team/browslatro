export interface ShopActivity {
  readonly rerolls: number;
  readonly jokersBought: number;
  readonly consumablesBought: number;
  readonly vouchersBought: number;
  readonly jokersSold: number;
  readonly packsOpened: number;
  readonly packPicks: number;
  readonly moneySpent: number;
}

export function emptyShopActivity(): ShopActivity {
  return {
    rerolls: 0,
    jokersBought: 0,
    consumablesBought: 0,
    vouchersBought: 0,
    jokersSold: 0,
    packsOpened: 0,
    packPicks: 0,
    moneySpent: 0,
  };
}

export function mergeShopActivity(a: ShopActivity, b: ShopActivity): ShopActivity {
  return {
    rerolls: a.rerolls + b.rerolls,
    jokersBought: a.jokersBought + b.jokersBought,
    consumablesBought: a.consumablesBought + b.consumablesBought,
    vouchersBought: a.vouchersBought + b.vouchersBought,
    jokersSold: a.jokersSold + b.jokersSold,
    packsOpened: a.packsOpened + b.packsOpened,
    packPicks: a.packPicks + b.packPicks,
    moneySpent: a.moneySpent + b.moneySpent,
  };
}

export function averageShopActivity(
  activities: ReadonlyArray<ShopActivity>,
): ShopActivity {
  if (activities.length === 0) return emptyShopActivity();
  const total = activities.reduce(mergeShopActivity, emptyShopActivity());
  const n = activities.length;
  return {
    rerolls: total.rerolls / n,
    jokersBought: total.jokersBought / n,
    consumablesBought: total.consumablesBought / n,
    vouchersBought: total.vouchersBought / n,
    jokersSold: total.jokersSold / n,
    packsOpened: total.packsOpened / n,
    packPicks: total.packPicks / n,
    moneySpent: total.moneySpent / n,
  };
}
