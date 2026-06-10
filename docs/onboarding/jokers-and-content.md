# Jokers and adding game content

The full Balatro catalog of **150 jokers** is implemented, and the joker subsystem is the
template for most content in Browslatro: **effects as data, pure engines as code**.
Understand this one subsystem and the rest (tarots, planets, spectrals, vouchers, bosses,
tags) feel familiar.

## The shape of a Joker

`src/items/jokers/types.ts`

```ts
export interface Joker {
  readonly id: string;            // stable kebab-case id, e.g. "green-joker"
  readonly name: string;          // display name (canonical English; i18n overrides exist)
  readonly description: string;   // player-facing text (authentic Balatro wording)
  readonly effect: JokerEffect;   // ← the behavior, as data (~120-arm union)
  readonly rarity: JokerRarity;   // common | uncommon | rare | legendary
  readonly edition?: JokerEdition;      // foil | holographic | polychrome | negative
  readonly stickers?: ReadonlyArray<JokerSticker>; // eternal | perishable | rental
  readonly state?: JokerStateValue;     // mutable counter for scaling jokers
  readonly sellBonus?: number;          // added sell value (Gift Card, Egg-style growth)
}
```

A Joker has **no methods**. Behavior is in `effect` — one arm of the `JokerEffect`
discriminated union (~120 arms) — plus, for scaling jokers, a `state` counter that
lifecycle reducers update. Simple arms look like:

```ts
{ kind: "additive-mult", amount: 4 }                          // +4 Mult
{ kind: "per-suit-mult", suit: "hearts", amount: 3 }          // +3 Mult per scored Heart
{ kind: "on-hand-type-x-mult", requires: "Pair", amount: 2 }  // ×2 if hand contains a Pair
{ kind: "on-hand-type-stack-mult", requires: "Pair", amount: 1 } // grows +1 each qualifying hand
```

## The central pattern: tagged union + exhaustive switch

**Effects are data; a small set of engines interpret them.** Each engine `switch`es over
`effect.kind`, handles the arms relevant to its phase, `break`s on every other arm, and
ends with:

```ts
default:
  assertNeverEffect(effect);   // compile error if an effect.kind is unhandled
```

`assertNeverEffect` (`scoring/utils.ts`) takes `never`: add a new kind and TypeScript
fails the build at every engine until you've decided — for each one — whether the new
effect participates. That's why `handLevel.ts` and `perCard.ts` contain long lists of
bare `case` labels falling through to `break`: each engine explicitly opts out of the
kinds the others own.

Every handled arm pushes a **step**
(`{ jokerId, jokerName, additiveMult?, additiveChips?, xMultFactor?, moneyEarned? }`)
and appends to `firedJokerIds` — steps drive the animation replay, the joker pulse, and
the scoring trace.

## The engine files

`src/items/jokers/scoring/`:

| File | Role |
| --- | --- |
| `handLevel.ts` | Once-per-hand contributions; also applies editions and held-card retriggers (Mime) |
| `perCard.ts` | Per-scoring-card contributions (suit mults, face triggers, chance rolls) |
| `retriggers.ts` | `expandScoringRetriggers` — how many extra times each card scores (red seals + Hack, Sock and Buskin, Dusk, Hanging Chad, Seltzer) |
| `copy.ts` | `resolveJokerEffect` — Blueprint (copy right) / Brainstorm (copy leftmost), chain-following with cycle detection, `noop` when incompatible |
| `scoredCardMutations.ts` | Permanent card changes from scoring (Midas Mask → gold faces; Vampire eats enhancements) |
| `consumableCreators.ts` | Tarots/Spectrals spawned by playing a hand (8 Ball, Séance, Sixth Sense, Superposition, Vagabond) |
| `onDiscard.ts` | Discard-triggered money (Faceless Joker, Mail-In Rebate, Trading Card's first-discard payout + destruction) |
| `endOfRound.ts` | Round-end money (Golden Joker, Delayed Gratification, Cloud 9, Satellite's per-unique-planet payout, Rocket-style growth) |

Engines that iterate equipped jokers for scoring resolve each effect **through
`copy.ts`** (`resolveJokerEffect(jokers, i)`, not `jokers[i].effect`) so
Blueprint/Brainstorm work for free, and they filter with `isJokerActive` so perished
jokers stop contributing.

## Stateful ("scaling") jokers

Ride the Bus, Green Joker, Obelisk, Runner, Square Joker, Ramen, Ice Cream, Popcorn,
Castle, Wee Joker, Hit the Road, Campfire, Madness… all grow (or decay) over a run. The
machinery:

- The accumulator is `joker.state` — currently `{ kind: "counter", value }`.
- **Pure lifecycle reducers** in `src/items/jokers/state.ts` update it. Each takes the
  joker list + an event context and returns a *new* list:

| Event | Reducer | Wired in |
| --- | --- | --- |
| Hand played | `applyHandPlayedToJokerStates` | `usePlayHand` |
| Cards discarded | `applyDiscardToJokerStates` | `useDiscardPipeline` |
| Consumable used | `applyConsumableUsedToJokerStates` | `useConsumableActions` |
| Shop reroll / pack skip | `applyShopRerollToJokerStates` / `applyPackSkipToJokerStates` | `actions` |
| Joker sold | `applySellToJokerStates` | `actions` |
| Blind selected | `applyMadnessOnBlindSelect`, `applyCeremonialDaggerOnBlindSelect` | `useRoundLifecycle` |
| Round end | `applyRoundEndToJokerStates`, `applyGiftCardToJokerSellValues` | `actions` |
| Lucky / glass / destruction procs | `applyLuckyTriggersToJokerStates`, `applyGlassShatterToJokerStates`, `applyCardsDestroyedToJokerStates`, `applyEnhancementsEatenToJokerStates` | `usePlayHand` |

- **Self-destruction is filtering.** Depleting/bust jokers (Ramen at ×1, Ice Cream at 0
  chips, Gros Michel/Cavendish on a failed roll, Turtle Bean expired) are simply omitted
  from the reducer's returned list — unless `eternal`.
- **The live "Currently:" readout.** `src/items/jokers/currentValue.ts` →
  `jokerCurrentValue(joker, context)` turns state (or a deck/money query) into the value
  shown on the tile and tooltip — *"Currently: +3 Mult"*, *"X3 Mult in 2 hands"*. Add an
  arm here for every new scaling joker or the tile won't show progress (there's an e2e
  spec for this: `e2e/joker-tooltip-current-value.spec.ts`).

Keep the read/write split clean: **engines read state, reducers write it.** Scoring never
mutates; events never score. `state` is plain serializable data, so save/restore covers
it automatically.

## Passive run-state queries

If a joker changes a *rule* rather than a *score*, it's a pure query in
`src/items/jokers/collection.ts`, consumed where that rule is enforced:

- `handEvalOptionsFromJokers` — Four Fingers / Shortcut / Smeared bend hand detection.
- `allCardsScoreFromJokers` (Splash), `chipsPerScoredCardFromJokers` (Hiker),
  `firstHandCardCopyCount` (DNA), `handPlayUpgradeRolls` (Space Joker).
- `canPreventDeath` / `consumeDeathPreventer` (Mr. Bones),
  `disablesBossBlindsFromJokers` (Chicot), `allowsDuplicateJokers` (Showman).
- `probabilityMultiplierFromJokers` (Oops! All 6s — multiplies every `rollChance`).
- `interestMultiplierFromJokers`, `extraStartingHandsFromJokers`,
  `extraStartingDiscardsFromJokers`, `extraStartingHandSizeFromJokers`,
  `extraDebtFloorFromJokers` (Credit Card), `effectiveJokerCount` (negative editions),
  `heldRetriggerCountFromJokers` (Mime), `shopExitConsumableCopies`,
  `stoneCardsOnBlindSelectFromJokers`, `sealedCardsOnRoundBeginFromJokers`, …

## Factories, catalog, and i18n

`src/items/jokers/factories.ts` + `catalog.ts`:

- A **factory** (`create<Name>Joker(): Joker`) returns a fresh object; numeric tuning
  lives in named constants in `constants.ts`, never inline.
- `createJokerCatalog()` is the obtainable pool (what the shop, packs, and spectral
  effects draw from); `createLegendaryJokerCatalog()` is the separate legendary pool
  (Yorick, Triboulet, Chicot, Canio, Perkeo, Invisible Joker). Factories return new
  objects each call so two copies never share state.
- **Names/descriptions are canonical English in the factory.** Locale-specific display
  goes through per-id override maps in `src/i18n/jokerOverrides.ts` — don't translate in
  the factory.

The barrel `src/items/jokers.ts` re-exports the public surface; import from
`../items/jokers`, not deep paths, in app code.

## How to add a Joker

### Case A — reuses an existing effect kind (pure data, the common case)

1. Tuning constant in `constants.ts` if needed.
2. Factory in `factories.ts` with the authentic Balatro name/description/effect.
3. Register in `createJokerCatalog()`.
4. Co-located test `src/items/jokers/<name>.test.ts`, including a negative case (it does
   *nothing* when its condition isn't met).

No engine changes. Done.

### Case B — needs a new effect kind

1. Add the arm to `JokerEffect` in `types.ts`. **The build now fails** at every
   `assertNeverEffect` — implement the arm in the engine whose phase it belongs to, add
   it to the `break` list everywhere else.
2. Push a `step` + `firedJokerIds` entry so it animates and traces.
3. **Wire context if needed**: new situational data goes into `HandLevelContext`
   (`scoring/types.ts`) and must be populated at the call sites — `usePlayHand` *and*,
   for per-card effects, the animated re-run in `useScoringPipeline`. Forgetting the
   second site is the classic "works in unit tests, wrong in the live game" bug.
4. Factory + catalog + tests as in Case A.

### Case C — a scaling joker

On top of Case B:

1. A reducer arm in `state.ts` for the event(s) that grow/reset/deplete its counter,
   at the right lifecycle call site (table above).
2. A `jokerCurrentValue` arm in `currentValue.ts` for the tile readout.
3. The engine arm reads `joker.state`, not a fixed amount.
4. If it self-destructs, omit it from the reducer's returned list when depleted
   (respecting `eternal`).

### Case D — rule-benders, copies, retriggers, mutations

Add the arm to the dedicated engine (`copy.ts`, `retriggers.ts`,
`scoredCardMutations.ts`, `consumableCreators.ts`) or a query in `collection.ts`, and
wire it where that engine/query is consumed. The exhaustiveness safety net applies the
same way.

### Don't forget

Per `claude.md`: authentic Balatro effects only, full test coverage, strict TS, no
comments, ≤150 lines of app code per change — split bigger work into follow-up issues.

## Editions, stickers, and "active" jokers

- **Editions** (`editions.ts`): Foil `+50` chips, Holographic `+10` Mult, Polychrome
  `×1.5` (applied in `handLevel.ts`); `negative` grants an extra slot via
  `effectiveJokerCount`.
- **Stickers** (`stickers.ts`): `eternal` (can't be sold/destroyed — reducers and
  destroy paths must check it), `perishable` (expires after N rounds;
  `tickPerishableRounds`), `rental` (drains money each round). Stakes stamp stickers
  onto shop offers. A perished joker is **inactive**: filter with `isJokerActive`.
- Use `effectiveJokerCount`, not `jokers.length`, for slot-capacity checks.

## The same pattern, elsewhere

| Content | Effects as data | Catalog / picker |
| --- | --- | --- |
| Tarots | `tarots.ts` | `createTarotCatalog()` |
| Planets (level up hands) | `planets.ts` (`applyPlanetUpgrade`) | `createPlanetCatalog()` |
| Spectrals | `spectrals.ts` (`SpectralEffect`, enacted in `actions.applySpectralEffect`) | `createSpectralCatalog()` |
| Vouchers | `vouchers.ts` (queried via `extra*` / `*For` helpers) | `VOUCHER_CATALOG` / `pickVouchersForAnte` |
| Bosses | `bosses.ts` (`bossAdjustHandEntry`, `bossBlocksHandLabel`, …) | `createBossCatalog()` / `pickBossForAnte` |
| Tags (skip rewards) | `tags.ts` (`resolveTagEffect`) | `rollAnteSkipOffers` |
| Decks / Stakes | `decks.ts` / `stakes.ts` (modifier queries) | `NewRunScreen` options |
| Card enhancements / seals / editions | `cards/enhancements.ts`, `cards/seals.ts`, `cards/editions.ts` | — |

Spectral effects are enacted in the store (`actions.applySpectralEffect`) rather than a
pure engine because many mutate broad game state (destroy cards, add jokers, set money) —
but the principle holds: the card is data; one `switch` enacts it.
