# Onboarding to Browslatro

Welcome! Browslatro is a browser-native reimplementation of
[Balatro](https://www.playbalatro.com/) — the poker-roguelike deckbuilder — written in
React 19 + TypeScript, built with Vite, and tested with Vitest, Playwright, and Storybook.
It exists primarily as an **educational project**: a place to practice frontend, state
management, and game-logic modelling with a heavy emphasis on tests, accessibility, and
internationalization.

This folder is a guided tour for a new developer. Read in roughly this order:

| Doc | What it covers |
| --- | --- |
| `README.md` (this file) | Mental model, highlights, repo map, getting started, gotchas |
| [`architecture.md`](./architecture.md) | How the app is wired: boot order, the Zustand slice store, the hooks layer, render flow |
| [`scoring-pipeline.md`](./scoring-pipeline.md) | **Deep dive** — how a played hand becomes a number |
| [`animations.md`](./animations.md) | **Deep dive** — how scoring is sequenced into a step-by-step animation |
| [`jokers-and-content.md`](./jokers-and-content.md) | The full joker engine (effects, state, copying, retriggers) and how to add content |
| [`patterns.md`](./patterns.md) | Recurring conventions: slices, RNG, persistence, i18n, a11y, design tokens, Storybook, testing |

Alongside these, **read `CLAUDE.md` at the repo root** — it's the authoritative list of
project rules (strict TS, no comments, test requirements, workflow). Where any prose
disagrees, `CLAUDE.md` and the config files (`.yarnrc.yml`, `package.json`) win.

---

## The 60-second mental model

Balatro is a game of **escalating multiplication**. You play 5-card poker hands; each
hand scores roughly:

```
(base chips + card chips + bonuses) × (base mult + bonuses) × (a stack of ×mult factors)
```

You must clear a **blind**'s required score within a limited number of hands. Three
blinds (Small → Big → Boss) make an **ante**; clearing antes is the run. Between blinds
you visit a **shop** to buy **Jokers** (passive score modifiers — the full catalog of
150 is implemented), **consumables** (Tarot / Planet / Spectral cards), **vouchers**,
and booster **packs**. The game is about assembling a Joker + card-enhancement engine
that turns a modest poker hand into an astronomically large number.

Most interesting work lands in one of three places:

1. **The scoring pipeline** — getting `(chips × mult)` exactly right when jokers,
   enhancements, editions, seals, and boss effects stack. See
   [`scoring-pipeline.md`](./scoring-pipeline.md).
2. **The joker engine** — 150 jokers expressed as a ~120-arm effect union with state
   counters, retriggers, and copy/delegation. See
   [`jokers-and-content.md`](./jokers-and-content.md).
3. **The animation sequencing** — replaying the score computation one card / one joker
   at a time so the player *sees* it build. See [`animations.md`](./animations.md).

---

## Highlights — what's distinctive about this codebase

- **Pure logic, separated from React.** Game *rules* live in plain TypeScript modules
  under `src/scoring`, `src/cards`, `src/items`, and `src/run` — data in, data out, no
  hooks, no DOM. React (`src/components`, `src/hooks`) and the store (`src/store`) are a
  shell on top. This is why the unit suite is large and fast: most of it never mounts a
  component.

- **One store, many slices.** Global game state is a single
  [Zustand](https://github.com/pmndrs/zustand) store assembled from 17 focused slices
  (`src/store/*.ts`). UI preferences live in a second, tiny store
  (`src/components/system/preferences.ts`).

- **Effects are data; engines are code.** A Joker carries a `JokerEffect` — one arm of a
  big discriminated union — plus an optional `state` counter for scaling jokers. A set of
  pure engines interprets effects at score time, and pure reducers update state on game
  events. Exhaustive `switch` + `assertNever` means the compiler tells you every place a
  new effect kind must be considered.

- **The score is computed twice.** Once eagerly (to know the result and whether the round
  is won) and once incrementally (to drive the animation). Keeping the two passes in
  agreement is the central design tension. See [`scoring-pipeline.md`](./scoring-pipeline.md).

- **a11y and i18n are load-bearing, not bolt-ons.** Full i18next setup with English and
  Hawaiian (ʻŌlelo Hawaiʻi) locales and typed translation keys; focus traps, live-region
  announcements, keyboard alternatives for drag interactions, reduced-motion and
  forced-colors support — all with dedicated e2e specs.

- **Tests are a first-class deliverable.** Unit tests co-located with source; full-app
  integration tests that mount `<App />`; "scoring trace" tests asserting the exact
  human-readable score breakdown; CSS "layout tests"; a Storybook smoke test; and a
  ~36-spec Playwright e2e suite. CI shards the unit suite eight ways and publishes
  coverage + the Playwright report to GitHub Pages.

- **Determinism on tap.** Every randomized subsystem draws from an injectable RNG
  (`src/dev/rngConfig.ts`), and `rollChance` honors a global force-100% override for
  testing probabilistic effects.

- **Authentic mechanics.** Per `CLAUDE.md`, effects must match real Balatro — no invented
  numbers. When in doubt, check the Balatro wiki.

---

## Repository map

```
browslatro/
├── index.html, vite.config.ts          Vite entry + build config
├── CLAUDE.md                            Project rules & conventions (READ THIS)
├── e2e/                                 Playwright end-to-end specs (~36)
├── src/
│   ├── index.tsx                        Boot: tokens/buttons CSS → i18n → restore save → render
│   ├── App.tsx                          Top-level wiring: hooks → <Game>/<Sidebar>/modals
│   ├── constants.ts                     Hand base values, blind chip requirements
│   │
│   ├── cards/                           Card model: deck, enhancements, editions, seals, held-in-hand
│   ├── scoring/                         Pure scoring: hand detection, base score, payout, trace
│   │
│   ├── items/                           Game content (pure logic + catalogs)
│   │   ├── jokers/                      Effect union, factories, catalog (150), state, currentValue
│   │   │   └── scoring/                 Engines: handLevel, perCard, retriggers, copy,
│   │   │                                scoredCardMutations, consumableCreators, onDiscard, endOfRound
│   │   ├── bosses.ts  tags.ts  vouchers.ts  stakes.ts  decks.ts
│   │   └── tarots.ts  planets.ts  spectrals.ts  consumables.ts  packs.ts  shop.ts
│   │
│   ├── run/                             Per-round/per-run setup + stats helpers
│   ├── save/                            localStorage snapshot (Sets & Maps survive round-trips)
│   ├── store/                           The 17 Zustand slices — the single game store
│   ├── hooks/                           Orchestration: play-hand, scoring pipeline, discard, lifecycle
│   ├── ai/                              AI/ML advisor: headless loop, candidate enum, encoding,
│   │   └── advisor/                     ONNX policy + LLM advisor (see docs/ai-advisor/)
│   ├── components/                      UI by feature (cards, jokers, hud, shop, game, options, system)
│   ├── i18n/                            i18next setup, en + haw locales, typed keys, content overrides
│   ├── styles/                          Design tokens (tokens.css), shared button classes
│   ├── stories/                         Storybook utilities (withGame decorator, fixtures)
│   └── dev/                             RNG injection, chance override, e2e seeding seams
```

A useful heuristic: **`src/items` and `src/scoring` are where the *rules* live;
`src/store` and `src/hooks` are where the *game loop* lives; `src/components` is the
*skin*.**

For the AI move-suggestion system (the in-game Suggest buttons, autopilot, the ONNX
policy, and the offline training pipeline under `ml/`), see the dedicated
[**AI/ML advisor docs**](../ai-advisor/README.md).

---

## Getting started

This is a **Yarn 4 (Berry)** project using the **pnpm `nodeLinker`** (see `.yarnrc.yml`):
a real `node_modules/` is materialized per checkout from hardlinks into Yarn's global
store. Run `yarn install` in every fresh clone or worktree; it's near-instant once the
store is warm. Use `yarn`, never `npm`.

```sh
corepack enable          # Node picks the pinned Yarn from package.json
yarn install             # materializes node_modules

yarn start               # dev server with HMR at http://localhost:3000
yarn test                # Vitest once (yarn test:watch while iterating)
yarn typecheck           # tsc --noEmit — must be clean before committing
yarn e2e                 # Playwright suite (builds + previews first)
yarn storybook           # component workshop at http://localhost:6006
yarn build               # tsc + production bundle
```

Before opening a PR, the baseline is `yarn typecheck && yarn test` green, plus tests for
whatever you changed. See `CLAUDE.md` for the full ruleset (squash-merge, ≤150 lines of
app code per change, strict TS / no `any`, no code comments, work in worktrees, semantic
commits).

### Visually verifying your work

`CLAUDE.md` asks you to visually verify changes in a browser whenever possible, and the
app ships tooling for it (`yarn start`, then):

- **The "Apply modifiers" panel** — a disclosure under the game board
  (`src/components/game/ModifierPanel.tsx`): Add Chips / Add Multiplier / Multiply
  Multiplier, **Win** (calls `handleWin()` directly — fastest route to the shop), money
  and hand-size adjustments, Ante ±1, **Force Probabilities On**, and pickers to grant
  any specific Joker / Tarot / Planet / Spectral or force a pack pool into the next shop.
- **Dropdowns on Blind Select and the shop** to set any boss or voucher.
- **The Scoring Trace panel** in the sidebar (plus its EXPAND modal) — the
  contribution-by-contribution breakdown of recent hands; usually the fastest way to
  confirm a scoring change.

Note that dev affordances render **only in dev builds** (`import.meta.env.DEV`). For e2e
runs against a production preview there are localStorage opt-in seams — see the dev
seams section in [`patterns.md`](./patterns.md).

---

## Gotchas a new dev hits in week one

- **Two `scoring.ts` files.** `src/scoring/scoring.ts` is the *pure base-hand* scorer.
  `src/store/scoring.ts` is the Zustand *slice* holding live chips/mult and the animation
  cursors. They're unrelated; don't confuse them.

- **The real scoring math is in the hooks, not `scoreHand()`.** `scoreHand()` in
  `src/scoring/scoring.ts` knows only cards + enhancements. The *full* score (jokers,
  retriggers, editions, seals, steel, boss adjustments, dev bonuses) is assembled in
  `src/hooks/usePlayHand.ts`. Treat `scoreHand()` as a reference implementation.

- **Add a scoring contribution in *both* passes.** Anything added to the eager
  computation in `usePlayHand` needs a matching incremental application in
  `useScoringPipeline` (and a `ScoringEvent` for the trace), or the animated total won't
  land on the real one. This is the #1 scoring-bug class — see the two-pass section of
  [`scoring-pipeline.md`](./scoring-pipeline.md).

- **`Set` and `Map` are everywhere in state** (`selectedIds`, `destroyedCardIds`,
  `cardEnhancementsById`, …). The save layer round-trips them through `localStorage` with
  custom encode/decode, so they "just work" — but they're reference types: always build a
  *new* one in a setter, never mutate in place.

- **User-facing strings go through i18next.** Don't hardcode display text in components —
  add a key to `src/i18n/locales/en.ts` (and `haw.ts`) and use `t(...)`. Translation keys
  are typed, so a missing key is a compile error. Aria-labels too.

- **No comments.** `CLAUDE.md` forbids comments in code and CSS. Put explanation in names,
  commit messages, tests, or these docs.

- **Randomness is injected.** Don't call `Math.random()` directly in logic you want to
  test — thread an RNG parameter or use the relevant `RngConfig`, and roll probabilities
  through `rollChance` so the force-100% override applies. See
  [`patterns.md`](./patterns.md).

- **Use the shared design tokens and `.btn` classes.** Colors, surfaces, and focus rings
  come from CSS custom properties in `src/styles/tokens.css`; there are even unit "layout
  tests" asserting token usage. Hardcoded hex values in component CSS will stick out in
  review.
