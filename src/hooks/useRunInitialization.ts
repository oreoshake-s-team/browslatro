import { useEffect } from "react";
import { useGame } from "../store/game";
import { BASE_VOUCHER_SLOTS } from "../store/vouchers";
import { didRestoreFromSnapshot } from "../save/restore";
import { readSeededConsumables } from "../dev/seedConsumables";
import { bootIntoShop, shouldBootIntoShop } from "../dev/bootShop";
import { rollAnteSkipOffers, tagOfferRngConfig } from "../items/tags";
import { pickVouchersForAnte } from "../items/vouchers";
import { pickBossForAnte } from "../items/bosses";

export function useRunInitialization(): void {
  const setConsumables = useGame((state) => state.setConsumables);
  const pendingRunSelect = useGame((state) => state.pendingRunSelect);
  const setSkipTagOffers = useGame((state) => state.setSkipTagOffers);
  const setCurrentAnteVouchers = useGame(
    (state) => state.setCurrentAnteVouchers,
  );
  const setCurrentBoss = useGame((state) => state.setCurrentBoss);

  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    if (pendingRunSelect) return;
    const seeded = readSeededConsumables();
    if (seeded.length > 0) setConsumables(seeded);
  }, [pendingRunSelect, setConsumables]);

  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    setSkipTagOffers(rollAnteSkipOffers(tagOfferRngConfig.rng));
  }, [setSkipTagOffers]);

  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    setCurrentAnteVouchers(
      pickVouchersForAnte({ ante: 1, ownedIds: new Set() }, BASE_VOUCHER_SLOTS),
    );
  }, [setCurrentAnteVouchers]);

  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    setCurrentBoss(pickBossForAnte({ ante: 1 }));
  }, [setCurrentBoss]);

  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    if (shouldBootIntoShop()) bootIntoShop();
  }, []);
}
