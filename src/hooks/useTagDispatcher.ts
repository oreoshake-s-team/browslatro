import { useGame } from "../store/game";
import { play } from "../components/system/sounds";
import {
  resolveTagEffect,
  type TagId,
} from "../items/tags";
import type { RunStats } from "../run/runStats";
import { MAX_JOKERS, createJokerByRarity, createJokerCatalog } from "../items/jokers";
import { extraJokerSlots } from "../items/vouchers";
import { rollPackForPool, type PackPool, type PackVariant } from "../items/packs";
import { shopPickerRngConfig } from "../items/shop";
import {
  applyPlanetUpgrade,
  availablePlanets,
  createPlanetCatalog,
} from "../items/planets";
import { createTarotCatalog } from "../items/tarots";
import { createSpectralCatalog } from "../items/spectrals";
import { pickBossForAnte, bossPickerRngConfig } from "../items/bosses";
import { immediateMoneyGain } from "../run/immediateActions";

export interface UseTagDispatcherParams {
  readonly setPendingNextRoundHandSize: (
    updater: (prev: number) => number,
  ) => void;
}

export interface UseTagDispatcherResult {
  readonly applyGainedTag: (tagId: TagId, nextStats: RunStats) => void;
  readonly openTagPack: (pool: PackPool, variant: PackVariant) => void;
}

export function useTagDispatcher({
  setPendingNextRoundHandSize,
}: UseTagDispatcherParams): UseTagDispatcherResult {
  const jokers = useGame((s) => s.jokers);
  const setJokers = useGame((s) => s.setJokers);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const ante = useGame((s) => s.ante);
  const recentBossIds = useGame((s) => s.recentBossIds);
  const currentBoss = useGame((s) => s.currentBoss);
  const setCurrentBoss = useGame((s) => s.setCurrentBoss);
  const setHandStats = useGame((s) => s.setHandStats);
  const handPlayCounts = useGame((s) => s.handPlayCounts);
  const setPendingTags = useGame((s) => s.setPendingTags);
  const setPendingShopMods = useGame((s) => s.setPendingShopMods);
  const openPackOffer = useGame((s) => s.openPackOffer);

  function openTagPack(pool: PackPool, variant: PackVariant): void {
    play("pop");
    openPackOffer(
      rollPackForPool(
        pool,
        {
          planetCatalog: availablePlanets(createPlanetCatalog(), handPlayCounts),
          tarotCatalog: createTarotCatalog(),
          jokerCatalog: createJokerCatalog(),
          spectralCatalog: createSpectralCatalog(),
          excludedJokerIds: jokers.map((j) => j.id),
          rng: shopPickerRngConfig.rng,
        },
        variant,
      ),
    );
  }

  function applyGainedTag(tagId: TagId, nextStats: RunStats): void {
    const effect = resolveTagEffect(tagId);
    if (effect.category === "immediate") {
      const action = effect.action;
      if (action.kind === "open-pack") {
        openTagPack(action.pool, action.variant);
      } else if (action.kind === "create-jokers") {
        play("pop");
        const capacity = MAX_JOKERS + extraJokerSlots(ownedVoucherIds);
        setJokers((prev) => {
          let next = prev;
          for (let i = 0; i < action.count; i += 1) {
            const joker = createJokerByRarity(
              next,
              createJokerCatalog(),
              action.rarity,
              capacity,
              shopPickerRngConfig.rng,
            );
            if (joker) next = [...next, joker];
          }
          return next;
        });
      } else if (action.kind === "reroll-boss") {
        play("pop");
        setCurrentBoss(
          pickBossForAnte({
            ante,
            recentIds: new Set<string>([...recentBossIds, currentBoss.id]),
            rng: bossPickerRngConfig.rng,
          }),
        );
      } else if (action.kind === "upgrade-hand") {
        play("pop");
        const planets = createPlanetCatalog();
        const planet = planets[Math.floor(shopPickerRngConfig.rng() * planets.length)];
        setHandStats((prev) => {
          let next = prev;
          for (let i = 0; i < action.levels; i += 1) {
            next = applyPlanetUpgrade(next, planet);
          }
          return next;
        });
      } else {
        const economy = useGame.getState();
        economy.earn(
          immediateMoneyGain(action, { stats: nextStats, money: economy.money }),
        );
      }
      return;
    }
    setPendingTags((prev) => [...prev, tagId]);
    if (effect.category === "next-shop") {
      setPendingShopMods((prev) => [...prev, ...effect.modifiers]);
    } else if (effect.category === "next-round") {
      setPendingNextRoundHandSize((prev) => prev + effect.handSizeBonus);
    }
  }

  return { applyGainedTag, openTagPack };
}
