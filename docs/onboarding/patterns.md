# Common patterns & conventions

A grab-bag of the recurring idioms you'll meet everywhere in the codebase. Skim once now;
come back when a specific one bites you.

## Zustand slices

Covered in [`architecture.md`](./architecture.md). The short version:

- State is **one store** (`src/store/game.ts`) composed of focused slices.
- Setters accept **value-or-updater** via the `resolve()` helper.
- Compound, synchronous game actions live in the **actions slice**; time-based or
  multi-render flows live in **hooks**.
- Components subscribe via **narrow selectors** (`useGame((s) => s.money)`) to keep
  re-renders tight.
- Every slice has a `reset<Slice>()` and is wired into `resetGame()` / the lifecycle.

## Immutable updates with Sets and Maps

State holds a lot of `Set`/`Map` (`selectedIds`, `destroyedCardIds`,
`cardEnhancementsById`, `cardSealsById`, `recentBossIds`, …). Always produce a **new**
collection in a setter — never mutate in place — or React won't see the change:

```ts
setDestroyedCardIds((prev) => {
  if (prev.has(id)) return prev;      // no-op: return same ref to skip re-render
  const next = new Set(prev);
  next.add(id);
  return next;
});
```

Returning the *same reference* when nothing changed is a deliberate micro-optimization you'll
see often — Zustand bails out of notifying subscribers when the value is identical.

## Seeded / injectable randomness

`src/dev/rngConfig.ts`

Logic that needs randomness takes an RNG (`type RandomSource = () => number`) as a
parameter, defaulting to `Math.random`. Subsystems that need a *swappable* RNG (shop,
bosses, tarots, tags, enhancements) create a module-level `RngConfig`:

```ts
export const shopPickerRngConfig = createRngConfig();   // .rng is Math.random by default
// tests can do: shopPickerRngConfig.rng = mySeededRng;  then resetAllRngConfigs();
```

Every config registers in a global registry so `resetAllRngConfigs()` restores them all
between tests. **Rule of thumb: don't call `Math.random()` directly inside logic you want
to test** — thread an RNG or use a config.

### The `force100` chance override

`src/dev/chanceOverride.ts`

Probabilistic effects roll through `rollChance(chance, rng)` rather than `rng() < chance`
directly. A global `chanceOverrideConfig.force100` makes every roll succeed — wired to the
dev panel's "force probabilities" toggle (`App.tsx` syncs it from store state). This lets
tests and manual play deterministically trigger "X% chance" effects (Lucky cards, Business
Card, etc.).

## Persistence (auto-save / restore)

`src/save/`

The entire run auto-saves to `localStorage` and restores on load:

- **`subscribeAndAutoSave`** subscribes to the store and, on any change, schedules a save
  via `queueMicrotask` (coalescing a burst of updates into one write).
- **`runSnapshot.ts`** serializes/deserializes with custom `encode`/`decode` so `Set` and
  `Map` survive JSON round-trips (tagged `{ __type: "Set"|"Map", … }`). Functions are
  stripped. There's a `SCHEMA_VERSION` guard — bump it and handle migration if you change
  the state shape incompatibly.
- **`restoreSnapshotIfPresent`** loads the snapshot into the store and then calls
  `advanceCardIdsTo(maxCardId)` so freshly-generated card ids never collide with restored
  ones.
- **`didRestoreFromSnapshot()`** is the flag the `App.tsx` bootstrap effects check — each
  first-mount effect early-returns if a save was restored, so we don't overwrite the
  restored deck/jokers/boss/vouchers with fresh ones.

When you add state, it's persisted automatically. Just make sure it's serializable (no
class instances beyond `Set`/`Map`, no functions you need back).

## Card identity

`src/cards/types.ts` + `deck.ts`

Cards have a numeric `id` from a monotonic counter (`nextCardId()`). **Identity is by `id`,
not by value** — two `A♠`s are different cards. Scoring, selection, destruction, and
enhancement overrides all key off `id`. When you duplicate a card (e.g. spectral/pack
effects) you must mint a *new* id; when you transform one you keep it.

Enhancements/seals/editions are stored two ways: directly on the `Card` object for the
dealt hand, **and** in `cardEnhancementsById` / `cardSealsById` Maps so transformations
persist across deals/restores. `deckBuild.ts` (`applyEnhancementOverrides`,
`applySealOverrides`, `fullDeckPile`, `initialDeal`) reconciles the base deck + added cards
+ destroyed ids + override maps into the actual pile each round.

## "Steps" and the scoring trace

Pure engines don't push to the UI — they **return** a structured result that includes a
list of `steps` and/or emit `ScoringEvent`s. The hooks turn those into live state changes,
sounds, and trace entries. This keeps the math testable and the presentation swappable.
See [`scoring-pipeline.md`](./scoring-pipeline.md) and [`animations.md`](./animations.md).

## Continuation refs for multi-phase flows

When a flow spans multiple timed phases (scoring → steel → hand-level → finalize), "what to
do next" is stored in a **`useRef`** set up front, not in nested closures or `await`s. The
store-driven sequence calls the ref on completion, nulling it first so it can't fire twice.
This is unusual but load-bearing — see [`animations.md`](./animations.md#continuations-how-the-phases-chain).

## Code organization & CSS

- **Compartmentalize.** `claude.md` asks for code (and CSS) to be as self-contained as
  possible. Components are grouped by feature under `src/components/<feature>/`, each with
  its own `.css` and `.test.tsx` alongside.
- **Co-located tests.** `Foo.ts` ⟷ `Foo.test.ts`, `Foo.tsx` ⟷ `Foo.test.tsx`, same folder.
- **No comments** in code or CSS (project rule). Name things well; explain in commits/tests.
- **Strict TypeScript, no `any`.** Discriminated unions + exhaustive switches over
  `assertNever` are preferred to type assertions.

## Testing conventions

From `claude.md` (read it for the authoritative list):

- **Coverage is required** for all functionality; CI publishes the report to GitHub Pages.
- **Unit tests: one assertion each**, with a descriptive name. Include **negative cases**
  (the effect does nothing when its precondition fails).
- **Full-app integration tests** mount `<App />` and drive real `userEvent` interactions;
  these *may* use multiple assertions when they all describe the same end-state (the
  expensive part is the mount). Name them by scenario, not by assertion.
- **Scoring-trace tests** (`src/App.scoringTrace*.test.tsx`) assert the exact human-readable
  breakdown — update these whenever you change what contributes to a score.
- Determinism: use the RNG configs + `force100` rather than hoping `Math.random` cooperates.
- Don't add comments to tests. If a test file passes ~1500 lines, file a follow-up to split
  it.

Run `yarn typecheck && yarn test` before every PR; run the e2e suite (`yarn e2e`) when you
touch interaction flows.

## Accessibility & i18n

`claude.md` makes a11y and i18n a priority. Practically: prefer semantic elements and ARIA
where it matters, respect `prefers-reduced-motion` (the scoring animation already collapses
to `stepMs === 0` — see `getScoringStepMs` in `App.tsx`), keep user-facing strings
centralized and translatable, and there's a high-visibility theme toggle
(`highVisibility`) you shouldn't regress. There's a dedicated `src/App.a11y.test.tsx`.

## Dev tooling

- **The "Apply modifiers" panel** (`src/components/game/ModifierPanel.tsx`) — a `<details>`
  disclosure under the game board, always available. Buttons: Add Chips / Add Multiplier /
  Multiply Multiplier, **Win** (calls `handleWin()` directly — the fastest way to reach
  the shop), money ±$10, hand size ±1, Force Probabilities On, plus pickers to grant any
  specific Tarot / Planet / Spectral and to force a pack pool into the next shop. The
  Blind Select screen's boss dropdown and the shop's voucher dropdown are the same idea
  for bosses/vouchers.
- **Dev modifiers slice** (`src/store/devModifiers.ts`) — backs the panel's chips/mult
  bumps (`devChipsBonus`, `devMultBonus`, `devMultFactor`) and `forceProbabilities`. These
  are *sticky* and only reset on New Game, so they survive scoring/finalize; the Sidebar
  folds them into the displayed numbers. They emit their own `ScoringEvent`s labelled
  "(dev)".
- **RNG configs + `force100`** (above) for deterministic manual testing.

## Quick "where do I…?" index

| I want to… | Go to |
| --- | --- |
| Add a Joker | [`jokers-and-content.md`](./jokers-and-content.md) |
| Change how a hand scores | `usePlayHand.ts`, `scoring/`, [`scoring-pipeline.md`](./scoring-pipeline.md) |
| Add/adjust an animation phase | `useScoringPipeline.ts`, [`animations.md`](./animations.md) |
| Add persisted state | a store slice + verify it serializes (`src/save/`) |
| Add randomness | thread an RNG / add an `RngConfig` (`src/dev/rngConfig.ts`) |
| Add a shop/pack/boss/voucher/tag | the matching module in `src/items/` |
| Change round/run setup | `src/run/`, `useRoundLifecycle.ts`, `actions.handleWin` |
| Touch top-level wiring | `App.tsx` (keep it to wiring) |
</content>
