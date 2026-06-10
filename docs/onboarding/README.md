# Onboarding to Browslatro

Welcome! Browslatro is a slimmed-down, browser-native reimplementation of
[Balatro](https://www.playbalatro.com/) — the poker-roguelike deckbuilder — written in
React 19 + TypeScript and built with Vite. It exists primarily as an **educational
project**: a place to practice frontend, state management, and game-logic modelling
with a heavy emphasis on tests, accessibility, and clean, compartmentalized code.

This folder is a guided tour for a new developer. Read the documents in roughly this
order:

| Doc | What it covers |
| --- | --- |
| [`README.md`](./README.md) (this file) | Highlights, repo map, getting started, the mental model |
| [`architecture.md`](./architecture.md) | How the app is wired: the Zustand slice store, the hooks layer, render flow |
| [`scoring-pipeline.md`](./scoring-pipeline.md) | **Deep dive** — how a played hand becomes a number |
| [`animations.md`](./animations.md) | **Deep dive** — how that scoring is sequenced into a step-by-step animation |
| [`jokers-and-content.md`](./jokers-and-content.md) | The discriminated-union effect pattern and how to add new game content |
| [`patterns.md`](./patterns.md) | Recurring conventions: slices, seeded RNG, persistence, dev tooling, testing, a11y/i18n |

> These docs describe the codebase as of the `main` branch. If you touch a subsystem,
> please keep the relevant doc honest — see [`patterns.md`](./patterns.md) for the docs
> conventions.

---

## The 60-second mental model

Balatro is a game of **escalating multiplication**. You play 5-card poker hands; each
hand produces a score of roughly:

```
(base chips + card chips + bonuses) × (base mult + bonuses) × (a stack of ×mult multipliers)
```

You must clear a **blind**'s required score within a limited number of hands. Three
blinds (Small → Big → Boss) make an **ante**; clearing antes is the run. Between blinds
you visit a **shop** to spend money on **Jokers** (passive score modifiers),
**consumables** (Tarot/Planet/Spectral cards), **vouchers**, and booster **packs**.
The whole game is about assembling a Joker + card-enhancement engine that turns a modest
poker hand into an astronomically large number.

Almost every interesting bug or feature lives in one of two places:

1. **The scoring pipeline** — getting `(chips × mult)` exactly right when dozens of
   Jokers, card enhancements, editions, seals, and boss effects all stack. This is the
   hard part. See [`scoring-pipeline.md`](./scoring-pipeline.md).
2. **The animation sequencing** — replaying that computation one card / one Joker at a
   time so the player can *see* the score build. See [`animations.md`](./animations.md).

---

## Highlights — what's distinctive about this codebase

- **Pure logic, separated from React.** The game *rules* live in plain TypeScript modules
  under `src/scoring`, `src/cards`, `src/items`, and `src/run`. They take data in and
  return data out — no hooks, no DOM. React (`src/components`, `src/hooks`) and the store
  (`src/store`) are a thin, replaceable shell on top. This is why the test suite is huge
  and fast: most of it never mounts a component.

- **One store, many slices.** Global state is a single [Zustand](https://github.com/pmndrs/zustand)
  store assembled from ~20 focused slices (`src/store/*.ts`). See
  [`architecture.md`](./architecture.md).

- **Effects are data, not code.** A Joker doesn't contain a function; it contains a
  `JokerEffect` — a tagged member of a big discriminated union. A handful of central
  engines `switch` over the union. Adding a Joker that reuses an existing effect kind is
  *pure data*. See [`jokers-and-content.md`](./jokers-and-content.md).

- **The score is computed twice.** Once eagerly (to know the final number and whether the
  round is won) and once again, incrementally, to drive the animation. Keeping those two
  passes in agreement is the central design tension of the project. See
  [`scoring-pipeline.md`](./scoring-pipeline.md).

- **Tests are a first-class deliverable.** `claude.md` makes coverage a hard requirement.
  Unit tests are typically one-assertion; full-app integration tests mount `<App />` and
  drive real user interactions. There are dedicated "scoring trace" tests that assert the
  exact human-readable breakdown of a score.

- **Determinism on tap.** Every randomized subsystem draws from an injectable RNG
  (`src/dev/rngConfig.ts`) and there's a global `force100` chance override
  (`src/dev/chanceOverride.ts`) so probabilistic effects can be tested deterministically.

- **Authentic mechanics.** Per `claude.md`, game effects must match real Balatro — no
  placeholder numbers. When in doubt, check the Balatro wiki.

---

## Repository map

```
browslatro/
├── index.html, vite.config.ts          Vite entry + build config
├── src/
│   ├── App.tsx                          Top-level component; wires hooks → <Game>/<Sidebar>/modals
│   ├── index.tsx, Telemetry.tsx         Bootstrap + web-vitals/analytics
│   ├── constants.ts                     Hand base values, blind chip requirements
│   │
│   ├── cards/                           Card model: deck, enhancements, editions, seals, held-in-hand
│   ├── scoring/                         Pure scoring: hand detection, base hand score, payout, trace
│   │
│   ├── items/                           Game content (mostly pure logic + catalogs)
│   │   ├── jokers/                      Jokers: effect union, factories, catalog, scoring engines
│   │   │   └── scoring/                 The Joker scoring engines (hand-level, per-card, end-of-round…)
│   │   ├── bosses.ts  tags.ts  vouchers.ts  stakes.ts  decks.ts
│   │   ├── tarots.ts  planets.ts  spectrals.ts  consumables.ts  packs.ts  shop.ts
│   │
│   ├── run/                             Per-round/per-run setup + stats helpers
│   ├── save/                            localStorage snapshot serialize/restore (Sets & Maps survive)
│   ├── store/                           Zustand slices — the single global store
│   ├── hooks/                           React orchestration: play-hand, scoring pipeline, discard, lifecycle
│   ├── components/                      UI, grouped by feature (cards, jokers, hud, shop, game, …)
│   └── dev/                             RNG injection + dev-only chance override
│
├── e2e/                                 Playwright end-to-end specs
├── docs/                                You are here
├── claude.md                            Project rules & conventions (READ THIS)
└── README.md                            Build/test/run scripts
```

A useful heuristic: **`src/items` and `src/scoring` are where the *rules* live;
`src/store` and `src/hooks` are where the *game loop* lives; `src/components` is the
*skin*.**

---

## Getting started

This is a **Yarn 4 (Berry) + Plug'n'Play** project — there is **no `node_modules/`** and
you must use `yarn`, never `npm`.

```sh
corepack enable          # lets Node pick the pinned Yarn from package.json
yarn install             # near-instant under PnP (release binary is committed)

yarn start               # dev server with HMR at http://localhost:3000
yarn test                # Vitest once (use yarn test:watch while iterating)
yarn typecheck           # tsc --noEmit — must be clean before committing
yarn e2e                 # build + vite preview + Playwright
yarn build               # tsc + production bundle
```

Before opening a PR, the baseline is: `yarn typecheck && yarn test` green, plus tests for
whatever you changed. See `claude.md` for the full ruleset (squash-merge, ≤150 lines of
app code per change, strict TS / no `any`, no code comments, work in worktrees, etc.).

---

## Gotchas a new dev hits in week one

- **Two `scoring.ts` files.** `src/scoring/scoring.ts` is the *pure base-hand* scorer.
  `src/store/scoring.ts` is the Zustand *slice* that holds live chips/mult and animation
  cursors. They are unrelated; don't confuse them.

- **The real scoring math is in the hooks, not `scoreHand()`.** `scoreHand()` in
  `src/scoring/scoring.ts` only knows about cards + enhancements. The *full* score
  (Jokers, editions, seals, steel, boss adjustments, dev bonuses) is assembled in
  `src/hooks/usePlayHand.ts`. `scoreHand()` is essentially a reference/unit-test helper.

- **`Set` and `Map` are everywhere in state** (`selectedIds`, `destroyedCardIds`,
  `cardEnhancementsById`, …). The persistence layer has custom encode/decode so they
  round-trip through `localStorage`. When you add a `Set`/`Map` to state, it just works —
  but remember they're reference types, so always create a *new* one in setters.

- **No comments.** `claude.md` forbids comments in code and CSS. Existing inline `//`
  comments are legacy; don't add more. Put explanation in commit messages, tests, or
  these docs.

- **Randomness is injected.** Don't call `Math.random()` directly in logic you want to
  test — thread an RNG through, or use the relevant `RngConfig`. See
  [`patterns.md`](./patterns.md).
</content>
