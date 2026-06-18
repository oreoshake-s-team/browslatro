import { useGame } from "../store/game";
import { play } from "../components/system/sounds";
import {
  resolveTagEffect,
  type AnteSkipOffer,
  type TagId,
} from "../items/tags";
import type { RunStats } from "../run/runStats";
import { MAX_JOKERS, createJokerByRarity } from "../items/jokers";
import { availableJokerCatalog } from "../store/jokerCatalog";
import { deckJokerSlotsDelta } from "../items/decks";
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

export interface UseTagDispatcherResult {
  readonly applyGainedTag: (
    offer: AnteSkipOffer | TagId,
    nextStats: RunStats,
  ) => void;
  readonly openTagPack: (pool: PackPool, variant: PackVariant) => void;
}

export function useTagDispatcher(): UseTagDispatcherResult {
  const setPendingNextRoundHandSize = useGame(
    (s) => s.setPendingNextRoundHandSize,
  );
  const jokers = useGame((s) => s.jokers);
  const setJokers = useGame((s) => s.setJokers);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const selectedDeck = useGame((s) => s.selectedDeck);
  const ante = useGame((s) => s.ante);
  const recentBossIds = useGame((s) => s.recentBossIds);
  const currentBoss = useGame((s) => s.currentBoss);
  const setCurrentBoss = useGame((s) => s.setCurrentBoss);
  const setHandStats = useGame((s) => s.setHandStats);
  const handPlayCounts = useGame((s) => s.handPlayCounts);
  const setPendingTags = useGame((s) => s.setPendingTags);
  const setPendingShopMods = useGame((s) => s.setPendingShopMods);
  const openPackOffer = useGame((s) => s.openPackOffer);
  const setPendingJokerGrantIds = useGame(
    (s) => s.setPendingJokerGrantIds,
  );

  function openTagPack(pool: PackPool, variant: PackVariant): void {
    play("pop");
    openPackOffer(
      rollPackForPool(
        pool,
        {
          planetCatalog: availablePlanets(createPlanetCatalog(), handPlayCounts),
          tarotCatalog: createTarotCatalog(),
          jokerCatalog: availableJokerCatalog(useGame.getState()),
          spectralCatalog: createSpectralCatalog(),
          excludedJokerIds: jokers.map((j) => j.id),
          rng: shopPickerRngConfig.rng,
        },
        variant,
      ),
    );
  }

  function applyGainedTag(
    offer: AnteSkipOffer | TagId,
    nextStats: RunStats,
  ): void {
    const tagId = typeof offer === "string" ? offer : offer.id;
    const orbitalHand = typeof offer === "string" ? undefined : offer.orbitalHand;
    const effect = resolveTagEffect(tagId);
    if (effect.category === "immediate") {
      const action = effect.action;
      if (action.kind === "open-pack") {
        openTagPack(action.pool, action.variant);
      } else if (action.kind === "create-jokers") {
        play("pop");
        const capacity = Math.max(
          0,
          MAX_JOKERS +
            extraJokerSlots(ownedVoucherIds) +
            deckJokerSlotsDelta(selectedDeck),
        );
        const grantedIds: string[] = [];
        const catalog = availableJokerCatalog(useGame.getState());
        setJokers((prev) => {
          let next = prev;
          for (let i = 0; i < action.count; i += 1) {
            const joker = createJokerByRarity(
              next,
              catalog,
              action.rarity,
              capacity,
              shopPickerRngConfig.rng,
            );
            if (joker) {
              next = [...next, joker];
              grantedIds.push(joker.id);
            }
          }
          return next;
        });
        if (grantedIds.length > 0) {
          setPendingJokerGrantIds((prev) => [...prev, ...grantedIds]);
        }
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
        const planets = availablePlanets(createPlanetCatalog(), handPlayCounts);
        const planet = orbitalHand
          ? planets.find((p) => p.hands.includes(orbitalHand)) ??
            planets[Math.floor(shopPickerRngConfig.rng() * planets.length)]
          : planets[Math.floor(shopPickerRngConfig.rng() * planets.length)];
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
