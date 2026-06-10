# Jokers and adding game content

Jokers are the most-extended part of the game, and their design — **effects as data, a
central engine as code** — is the template for most content in Browslatro. Understand this
one subsystem and the rest (tarots, planets, spectrals, vouchers, bosses, tags) feel
familiar.

## The shape of a Joker

`src/items/jokers/types.ts`

```ts
export interface Joker {
  readonly id: string;            // stable kebab-case id, e.g. "even-steven"
  readonly name: string;          // display name
  readonly description: string;   // player-facing text (authentic Balatro wording)
  readonly effect: JokerEffect;   // ← the behavior, as data
  readonly rarity: JokerRarity;   // common | uncommon | rare | legendary
  readonly edition?: JokerEdition;      // foil | holographic | polychrome | negative
  readonly stickers?: ReadonlyArray<JokerSticker>; // eternal | perishable | rental
}
```

A Joker has **no methods**. Its behavior is entirely in `effect`, which is one arm of the
`JokerEffect` discriminated union (~50 arms). Examples:

```ts
{ kind: "additive-mult", amount: 4 }                          // +4 Mult
{ kind: "per-suit-mult", suit: "hearts", amount: 3 }          // +3 Mult per scored Heart
{ kind: "on-hand-type-x-mult", requires: "Pair", amount: 2 }  // ×2 Mult if hand contains a Pair
{ kind: "stencil" }                                           // ×1 Mult per empty Joker slot
```

## The central pattern: tagged union + exhaustive switch

This is the single most important pattern in the codebase. **Effects are data; a small set
of engines interpret them.**

- The union lives in `types.ts`.
- The **engines** that consume it live in `src/items/jokers/scoring/`:
  - `handLevel.ts` — fires once per hand
  - `perCard.ts` — fires once per scoring card
  - `onDiscard.ts` — fires on discard
  - `endOfRound.ts` — fires when a blind is cleared
- Each engine `switch`es over `effect.kind`. It handles the arms relevant to its phase and
  **`break`s on every other arm**, ending with:

```ts
default:
  assertNeverEffect(effect);   // compile error if an effect.kind is unhandled
```

`assertNeverEffect` (`scoring/utils.ts`) takes `never`. If you add a new `effect.kind` and
forget to handle it *in every engine that switches over the union*, TypeScript fails the
build. That's the safety net: **the type system forces you to decide, for each engine,
whether a new effect participates.** This is why both `handLevel.ts` and `perCard.ts`
contain long lists of bare `case` labels falling through to `break` — each engine is
explicitly opting *out* of the kinds the other engine owns.

Every handled arm pushes a **step** describing what it did
(`{ jokerId, jokerName, additiveMult?, additiveChips?, xMultFactor?, moneyEarned? }`) and
appends to `firedJokerIds`. Steps drive both the animation replay and the scoring trace
(see [`animations.md`](./animations.md)).

## Factories and the catalog

`src/items/jokers/factories.ts` + `catalog.ts`

- A **factory** is a `create<Name>Joker(): Joker` function that returns a fresh Joker
  object. Numeric tuning lives in named constants in `constants.ts`, never inline:

  ```ts
  export function createGreedyJoker(): Joker {
    return {
      id: "greedy-joker",
      rarity: "common",
      name: "Greedy Joker",
      description: "+3 Mult per scored Diamond",
      effect: { kind: "per-suit-mult", suit: "diamonds", amount: SUIT_MULT_AMOUNT },
    };
  }
  ```

- The **catalog** (`createJokerCatalog()`) returns the list of all obtainable Jokers; it's
  what the shop, packs, and spectral effects draw from. Legendary Jokers have their own
  `createLegendaryJokerCatalog()`. Factories return *new* objects each call so two copies
  of a Joker don't share state.

The barrel file `src/items/jokers.ts` re-exports the public surface (types, engines,
catalog, collection helpers, stickers, editions). Import from `../items/jokers`, not deep
paths, in app code.

## How to add a Joker

### Case A — reuses an existing effect kind (pure data, the common case)

Most new Jokers are a re-parameterization of an effect that already exists.

1. Add a tuning constant to `src/items/jokers/constants.ts` if needed.
2. Add a `create<Name>Joker()` factory in `factories.ts`.
3. Register it in `createJokerCatalog()` in `catalog.ts`.
4. Add a `src/items/jokers/<name>.test.ts` covering the effect (include a negative case —
   it does *nothing* when its condition isn't met).

No engine changes, no `switch` edits. Done.

### Case B — needs a new effect kind (data + one engine arm)

1. Add the new arm to `JokerEffect` in `types.ts`.
2. **Build now fails** at every `assertNeverEffect`. For each engine that switches over the
   union, either implement the arm or add it to the `break` list. Implement it in the
   engine whose *phase* it belongs to (hand-level vs per-card vs discard vs end-of-round).
3. When implemented, push a `step` and add to `firedJokerIds` so it animates and traces.
4. **Wire context if needed.** If your effect reads new situational data (e.g. "cards in
   the remaining deck"), add a field to `HandLevelContext` in `scoring/types.ts` and
   populate it where the engine is called — `usePlayHand.submitHand` (and, for per-card
   effects, also the animated re-run in `useScoringPipeline`, since random per-card effects
   are resolved at animation time). **This is the step people forget**, and the symptom is
   "works in unit tests, does nothing / wrong value in the live game" or "animated score ≠
   final score." See the two-pass discussion in [`scoring-pipeline.md`](./scoring-pipeline.md).
5. Add the factory + catalog entry (as in Case A) and write the test.

### Don't forget

- Per `claude.md`: authentic Balatro effect (no invented numbers), full test coverage,
  strict TS (no `any`), and keep a single change under ~150 lines of app code — split
  bigger work into follow-ups.

## Editions, stickers, and "active" Jokers

- **Editions** (`editions.ts`) modify a Joker: Foil/Holographic/Polychrome add
  chips/mult/×mult (applied inside `handLevel.ts`); `negative` grants an extra slot via
  `effectiveJokerCount`.
- **Stickers** (`stickers.ts`): `eternal` (can't be sold/destroyed), `perishable` (expires
  after N rounds — `tickPerishableRounds`), `rental` (drains money each round). A perished
  Joker is **inactive**: scoring code filters with `jokers.filter(isJokerActive)` so it
  stops contributing without being removed.
- `effectiveJokerCount` counts toward the slot limit accounting for negative editions; use
  it, not `jokers.length`, for capacity checks.

## The same pattern, elsewhere

Once you see "data + central interpreter," you'll spot it across `src/items`:

| Content | Effects as data | Catalog / picker |
| --- | --- | --- |
| Tarots | `tarots.ts` | `createTarotCatalog()` |
| Planets (level up hands) | `planets.ts` (`applyPlanetUpgrade`) | `createPlanetCatalog()` |
| Spectrals | `spectrals.ts` (`SpectralEffect`, applied in `actions.applySpectralEffect`) | `createSpectralCatalog()` |
| Vouchers | `vouchers.ts` (queried via `extra*`/`*For` helpers) | `VOUCHER_CATALOG` / `pickVouchersForAnte` |
| Bosses | `bosses.ts` (`bossAdjustHandEntry`, `bossBlocksHandLabel`, …) | `createBossCatalog()` / `pickBossForAnte` |
| Tags (skip rewards) | `tags.ts` (`resolveTagEffect`) | `rollAnteSkipOffers` |
| Card enhancements | `cards/enhancements.ts` (`applyCardEnhancement`) | — |
| Card seals | `cards/seals.ts` | — |

Spectral effects are interpreted in the store (`actions.applySpectralEffect`) rather than a
pure engine because many of them mutate broad game state (destroy cards, add Jokers, set
money). The principle is the same: the spectral *card* is data; one `switch` enacts it.
</content>
