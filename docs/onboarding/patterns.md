# Common patterns & conventions

The recurring idioms you'll meet everywhere. Skim once now; come back when one bites you.

## Zustand slices

Covered in [`architecture.md`](./architecture.md). The short version: one game store of
17 slices, value-or-updater setters via `resolve()`, compound synchronous actions in the
actions slice, time-based flows in hooks, narrow selectors in components, and a
`reset<Slice>()` per slice wired into `resetGame()`. UI preferences live in a second tiny
store (`src/components/system/preferences.ts`) backed by `localStorage`.

## Immutable updates with Sets and Maps

State holds many `Set`/`Map` fields (`selectedIds`, `destroyedCardIds`,
`cardEnhancementsById`, `cardSealsById`, `recentBossIds`, …). Always produce a **new**
collection in a setter; returning the *same reference* when nothing changed skips
re-renders:

```ts
setDestroyedCardIds((prev) => {
  if (prev.has(id)) return prev;      // no-op: same ref, no notify
  const next = new Set(prev);
  next.add(id);
  return next;
});
```

## Card identity

Cards have a numeric `id` from a monotonic counter (`nextCardId()` in `cards/deck.ts`).
**Identity is by `id`, not value** — two `A♠`s are different cards. Duplication (DNA,
pack effects) must mint new ids; transformation keeps them.

Run-long card modifications live in **overlay state** reconciled at deal time by
`cards/deckBuild.ts` (`fullDeckPile`, `initialDeal`): the base deck + `addedCards` −
`destroyedCardIds`, with `cardEnhancementsById` / `cardSealsById` applied on top. Cards
can also carry permanent `bonusChips` (Hiker). If your effect should outlive the current
hand, write the overlay — mutating only `dealt.hand` is the classic
"lost on next deal" bug.

## Seeded / injectable randomness

`src/dev/rngConfig.ts`: logic takes an RNG (`() => number`) parameter defaulting to
`Math.random`; subsystems needing a swappable one (shop, bosses, tags, enhancements…)
create a module-level `RngConfig` that tests can override and `resetAllRngConfigs()`
restores.

Probabilities roll through `rollChance(chance, rng)` (`src/dev/chanceOverride.ts`) —
never `rng() < chance` directly — because two global modifiers hook it: the dev **Force
Probabilities** toggle and Oops! All 6s' probability multiplier
(`probabilityMultiplierFromJokers`).

## Persistence (auto-save / restore)

`src/save/` — the entire run auto-saves to `localStorage` and restores on load:

- `subscribeAndAutoSave` schedules a save on any store change via `queueMicrotask`
  (coalescing bursts into one write).
- `runSnapshot.ts` serializes with custom encode/decode so `Set` and `Map` survive JSON
  (tagged `{ __type: "Set" | "Map", … }`); functions are stripped; a `SCHEMA_VERSION`
  guard protects against shape drift.
- `restoreSnapshotIfPresent` (called in `index.tsx` *before* render) loads the snapshot
  and calls `advanceCardIdsTo(maxCardId)` so new card ids never collide with restored
  ones.
- `didRestoreFromSnapshot()` is checked by every first-mount bootstrap effect in
  `App.tsx` so a restored run isn't clobbered with fresh state.

New state fields persist automatically — just keep them serializable. There's an e2e
spec (`e2e/save-restore.spec.ts`) covering the round-trip.

## i18n

`src/i18n/` — i18next + react-i18next, initialized synchronously at boot:

- **Locales**: `locales/en.ts` (canonical) and `locales/haw.ts` (ʻŌlelo Hawaiʻi).
  `detectLocale()` reads `localStorage` (`browslatro:locale`), then
  `navigator.language`; the switcher lives in Options and `persistLocale()` saves it.
  `document.documentElement.lang` stays in sync.
- **Typed keys**: `i18next.d.ts` types the `en` catalog, so `t("typo.key")` is a compile
  error.
- **All user-facing strings** — including aria-labels and screen-reader announcements —
  go through `t(...)`. Helpers in `strings.ts` build composed strings (`cardName`,
  suit names); `handLabels.ts` maps poker-hand labels.
- **Game content** (joker/tarot/planet/spectral names and descriptions) stays canonical
  English in the catalogs; locales override per-id via `jokerOverrides.ts` /
  `contentOverrides.ts`. Add content in English; add overrides only when a locale needs
  them.

## Design tokens & CSS conventions

- `src/styles/tokens.css` defines the theme as CSS custom properties (`--bg`,
  `--surface*`, `--border*`, `--text*`, `--accent-*`, `--focus-ring`). Component CSS
  consumes tokens — avoid raw hex values.
- `src/styles/buttons.css` provides shared `.btn` / `.btn--primary` / `--secondary` /
  `--danger` classes; use them instead of restyling buttons per component. Shared modal
  chrome lives in `components/system/Modal.css` (`.modal-overlay`, `.modal-panel--sm/md/lg`)
  and shared tooltip chrome in `components/system/Tooltip.css` (`.tooltip`).
- Component CSS is co-located (`Foo.tsx` + `Foo.css`) and scoped by a component-specific
  class prefix (`CLAUDE.md`: compartmentalize, no comments in CSS).
- **Class naming — kebab-case BEM with `--` for state/variant.** A class is
  `block`, `block-element` (flat kebab for structure), or `block[-element]--modifier`
  for a **state or variant**. The single dash is for structure; the double dash means
  "this same element, in a variant state." So a toggled button is
  `.hand-sort-button--active` (not `…-active`), a sold offer is `.shop-offer--sold`, a
  size variant is `.modal-panel--sm`. Exemplars to copy: `.btn--primary`,
  `.modal-panel--lg`, `.suggestion-section--recommendation`, `.coach-advice-ai--error`.
  Flat element names (`.coach-advice-head`, `.new-run-deck-grid`) stay flat — only
  state/variant suffixes use `--`. Migration to this convention is incremental
  (tracked under the CSS-consistency epic); not every file conforms yet.
- **Layout tests** (`*.layout.test.ts` in `src/styles/` and next to components) are unit
  tests that parse CSS and assert conventions — token usage, focus-visible rules, motion
  rules. If you add CSS that breaks one, the test names the convention you missed.
- Motion: scale durations by `--animation-speed`, respect `prefers-reduced-motion` and
  `forced-colors` (e2e: `a11y-motion-forced-colors.spec.ts`).

## Accessibility

a11y is a `CLAUDE.md` hard requirement with dedicated machinery:

- **`LiveAnnouncer`** (`components/system/`) — shared `aria-live` region for dynamic
  announcements (hands/discards remaining, chips × mult, drag reorders).
- **`useFocusTrap`** — portal dialogs trap Tab/Shift-Tab, mark the app shell inert, and
  restore focus to the opener on close. **`useEscapeToClose`** — every dialog closes on
  Escape. Use both in any new modal.
- **Keyboard alternatives for drag**: hand reorder has keyboard controls; new drag
  interactions need a keyboard path (WCAG 2.1.1).
- High-visibility mode (default **on**), color-contrast tokens, visible focus rings,
  heading hierarchy — each guarded by e2e specs (`a11y-*.spec.ts`,
  `focus-trap.spec.ts`, `dialog-semantics.spec.ts`, …).
- `src/App.a11y.test.tsx` covers app-level semantics in unit tests.

## Storybook

`yarn storybook` (port 6006). Every component under `src/components/` has a co-located
`*.stories.tsx` covering its visual states. Shared utilities in `src/stories/`:

- `withGame(seed?)` — decorator that resets the game store and lets a story seed it
  (`withGame((s) => s.setJokers([...]))`), so stories render real store-connected
  components.
- `fixtures.ts` — ready-made cards/jokers for stories.
- `stories.smoke.test.tsx` renders every story in the unit suite, so a story that throws
  fails CI.

When you add a component, add a story; when you add a visual state, add it to the story.

## Dev seams (manual testing & e2e seeding)

- **The "Apply modifiers" panel** (`components/game/ModifierPanel.tsx`): chips/mult
  bumps, **Win** (straight to the shop), money, hand size, Ante ±1, Force
  Probabilities, and grant-any Joker/Tarot/Planet/Spectral pickers. Backed by the
  `devModifiers` slice — the bumps are *sticky* until New Game and emit "(dev)" trace
  events.
- **`devToolsEnabled()`** (`src/dev/devTools.ts`): dev affordances render only in dev
  builds; setting `localStorage["browslatro:devTools"] = "1"` opts a production preview
  back in (how e2e specs use them).
- **Boot/seed seams** for e2e: `browslatro:bootShop=1` boots straight into the shop
  (`dev/bootShop.ts`); `browslatro:seedTarotIds` / `browslatro:seedSpectralIds` pre-fill
  the consumable tray (`dev/seedConsumables.ts`).

## Testing conventions

From `CLAUDE.md` (authoritative) plus the suite's own structure:

- **Coverage is required.** CI shards the unit suite eight ways and publishes coverage +
  the Playwright report to GitHub Pages.
- **Unit tests: one assertion each**, descriptive names, **negative cases** wherever
  possible, no comments. A file nearing ~1500 lines should be split (file an issue).
- **Full-app integration tests** (`src/App.*.test.tsx`) mount `<App />` and drive real
  `userEvent` flows; multiple assertions are fine when they describe one end-state
  (the mount is the expensive part). Shared helpers in `App.test-helpers.tsx`.
- **Trace tests** (`App.scoringTrace*.test.tsx`) assert exact score breakdowns — update
  them with any scoring change.
- **Layout tests** assert CSS conventions; **stories smoke test** renders every story.
- **e2e** (`yarn e2e`, ~36 specs) covers user-visible flows: rounds, shop, packs,
  save/restore, i18n, dark theme, and the a11y battery. New user-visible features get a
  spec; use the dev seams above for seeding.
- Determinism: RNG configs + `rollChance` overrides, never bare `Math.random` hope.

Run `yarn typecheck && yarn test` before every PR; run `yarn e2e` when you touch
interaction flows.

## Quick "where do I…?" index

| I want to… | Go to |
| --- | --- |
| Add a joker | [`jokers-and-content.md`](./jokers-and-content.md) |
| Change how a hand scores | `usePlayHand.ts`, `src/scoring/`, [`scoring-pipeline.md`](./scoring-pipeline.md) |
| Add/adjust an animation phase | `useScoringPipeline.ts`, [`animations.md`](./animations.md) |
| Add a user-facing string | `src/i18n/locales/en.ts` (+ `haw.ts`), use `t(...)` |
| Add persisted run state | a store slice (persists automatically if serializable) |
| Add a UI preference | `components/system/preferences.ts` |
| Add randomness | thread an RNG / `RngConfig`; probabilities via `rollChance` |
| Add a shop/pack/boss/voucher/tag/deck/stake | the matching module in `src/items/` |
| Change round/run setup | `src/run/`, `useRoundLifecycle.ts`, `actions.handleWin` |
| Add a modal | `useFocusTrap` + `useEscapeToClose` + dialog semantics |
| Style something | tokens in `src/styles/tokens.css`, shared `.btn` classes |
| Seed state for e2e | dev seams in `src/dev/` (`bootShop`, `seedConsumables`, `devTools`) |
