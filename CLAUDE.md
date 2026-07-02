# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Browslatro

Browslatro is an educational journey meant to help the author brush up on their frontend skills. The author is still learning react and struggles with CSS.

## Game Domain Context

- This is a Balatro clone. Terms like 'tags', 'spectral cards', 'vouchers', 'boss blinds', etc. refer to **in-game Balatro mechanics**, not GitHub/repo concepts.
- When implementing Balatro features (spectral cards, tarots, jokers, etc.), match the **authentic Balatro effects** - do not invent placeholder effects. Reference the Balatro wiki or ask the user if unsure.

# Design & UX questions

The author is still learning frontend and relies on Claude to surface design decisions early. Front-load discovery before writing UI code.

- Before starting any new task that touches UI, layout, visuals, interaction, or UX, ask **at least 3 design/UX clarifying questions** before making changes. Use the `AskUserQuestion` tool so options are easy to pick.
- Cover the dimensions that are actually ambiguous for the task — e.g. layout/placement, visual hierarchy and styling, interaction and feedback (hover/focus/active/disabled), empty/loading/error states, responsiveness across breakpoints, animation/motion, and accessibility (keyboard, screen reader, contrast). Don't ask about things already settled in the request or the codebase.
- Ask **more** questions, not fewer, when new evidence arrives mid-task — a screenshot, the rendered result in the browser, a changed requirement, or anything that reveals a fork the original questions didn't cover. Treat each new piece of evidence as a prompt to re-check assumptions and clarify before proceeding.
- Prefer a single batched round of questions (up to 4 per `AskUserQuestion` call) over a slow back-and-forth, but never skip the round entirely to "just start coding."
- This raises the baseline permanently: err toward asking when in doubt rather than guessing on the author's behalf.

# Status updates awaiting a response

- Whenever a status update is waiting on the author's response — a blocking question, a decision the author must make, a fork where you need a pick before continuing — always deliver it with the `AskUserQuestion` tool, not plain prose. Surface the options as selectable choices so the author can answer with a click.
- This applies to every such pause, not just UI work: clarifying an ambiguous request, choosing between approaches, confirming a destructive or hard-to-reverse action, or reporting a blocker that needs the author's input to unblock.
- Only fall back to plain text when there is genuinely nothing to decide — a pure progress note that does not need a reply.

# Hard requirements

- Squash all PRs into a single commit instead of merging/rebasing.
- All functionality must have test coverage.
- Ensure there are no typescript issues before committing.
- If a change requires more than 150 lines of changes to application code (excluding CSS, tests, config, etc), split it up into multiple changes and create followup tasks.
- Code should be as compartmenatalized as possible, including CSS.
- Code should be written in strict typescript, no use of any types.
- Only use strict typescript. No use of JS or "any" types.
- Greedy algorithms are always an anti-pattern — never introduce one in new code, not even as a fallback. See [Greedy algorithms are an anti-pattern](#greedy-algorithms-are-an-anti-pattern).
- Prioritize accessibility and i18n.
- When developing new branches, work in worktrees.
- Always use the issue template at `.github/ISSUE_TEMPLATE/issue.yml` when creating issues.
- Use yarn for all package management and script execution (e.g. `yarn install`, `yarn test`, `yarn build`). Do not use npm.

# Greedy algorithms are an anti-pattern

Greedy algorithms — anything that commits to the locally-best choice at each step without modeling consequences — are **always** an anti-pattern here. They look reasonable in isolation and quietly degrade quality everywhere they touch: they optimize the immediate step, never the outcome.

- **Never write a greedy algorithm in new code.** Refuse the pattern outright. If a task seems to call for "just take the best one right now," that is the signal to reach for a real approach (search, rollout, the trained policy, an exact/optimal method, or asking the user), not a greedy shortcut.
- **Never use greedy as a fallback.** A greedy "graceful degradation" path is still greedy. Do not add one. When the preferred mechanism is unavailable (a model fails to load, a service is down, data is missing), **fail fast** — surface a clear error and stop — rather than silently serving greedy results that masquerade as correct.
- **Prefer failing loudly over a quiet wrong answer.** A visible failure is debuggable and honest; a greedy fallback hides the breakage and ships a worse experience that no one notices.
- **The one sanctioned exception is the AI advisor's `greedyRanker`/`createGreedyAgent`**, which exists *only* as a benchmark floor to measure the trained policy against — never as a decision path, data source, or training target. Its usage is fenced by `src/ai/greedyUsage.guard.test.ts` (an allowlist of three legacy files). Do **not** widen that allowlist, and do **not** model new code on it. See [`docs/ai-advisor/ml-pipeline.md`](docs/ai-advisor/ml-pipeline.md) and [`docs/ai-advisor/engine-plumbing.md`](docs/ai-advisor/engine-plumbing.md).

# Commands

- `yarn install` — required in every fresh clone or worktree (Yarn 4 Berry, `nodeLinker: pnpm`; activate via `corepack enable`). Never use npm.
- `yarn start` — Vite dev server with HMR at http://localhost:3000.
- `yarn test` — run the Vitest unit suite once; `yarn test:watch` for watch mode; `yarn test:coverage` for coverage.
- `yarn test src/scoring/scoring.test.ts` — run a single test file; add `-t "name"` to filter by test name.
- `yarn typecheck` — `tsc --noEmit`; must be clean before committing.
- `yarn build && yarn e2e` — Playwright suite (chromium). `yarn e2e` serves the existing `build/` via `vite preview`, so build first. Run one spec with `yarn e2e e2e/shop.spec.ts`.
- `yarn lint:css` / `yarn lint:css:fix` — Stylelint over `src/**/*.css`.
- `yarn storybook` — component workshop at http://localhost:6006; every component under `src/components/` has co-located `*.stories.tsx`.
- `yarn build` — typecheck + production bundle into `build/`.
- ML pipeline (Python): `pip install -r ml/requirements.txt`, then `python3 -m unittest discover -s ml/tests`. See `ml/README.md` for the canonical workflow; TS-side dataset/eval scripts live in `scripts/`.

CI (`.github/workflows/test.yml`) runs CSS lint, the sharded unit suite, the `ml/` Python tests, and the e2e suite — all must be green before merging.

# Architecture overview

Full detail lives in `docs/onboarding/` (see [Documentation](#documentation)); this is the map.

**Four layers, strictly separated.** Game *rules* are pure TypeScript — data in, data out, no React, no DOM — under `src/scoring` (hand detection, base scoring, payout, trace), `src/cards` (deck, enhancements, editions, seals), `src/items` (jokers, tarots, planets, spectrals, bosses, tags, vouchers, decks, stakes, shop, packs), and `src/run`. On top sits a single Zustand store assembled from ~17 focused slices (`src/store/*.ts`); orchestration hooks (`src/hooks`: `usePlayHand`, `useScoringPipeline`, `useDiscardPipeline`, `useRoundLifecycle`, …) drive the game loop; `src/components` (grouped by feature: cards, jokers, hud, shop, game, options, system, advisor) is the skin. UI preferences live in a separate tiny store (`src/components/system/preferences.ts`).

**Effects are data; engines are code.** Each of the 150 jokers carries a `JokerEffect` — one arm of a large discriminated union — plus optional `state` for scaling jokers. Pure engines in `src/items/jokers/scoring/` interpret effects at score time; exhaustive `switch` + `assertNever` makes the compiler flag every place a new effect kind must be handled.

**The score is computed twice.** Eagerly in `src/hooks/usePlayHand.ts` (the real result — jokers, retriggers, editions, seals, boss effects) and incrementally in `useScoringPipeline` (driving the staged animation and the `ScoringEvent` trace). Any new scoring contribution must be added to **both** passes or the animated total won't land on the real one — this is the #1 scoring-bug class. Note the two unrelated `scoring.ts` files: `src/scoring/scoring.ts` is the pure base-hand scorer; `src/store/scoring.ts` is the store slice with live chips/mult and animation cursors.

**Cross-cutting invariants:**

- Randomness is injected (`src/dev/rngConfig.ts`); roll probabilities through `rollChance` so the force-100% test override applies. Never call `Math.random()` directly in logic.
- `Set`/`Map` are pervasive in state and round-trip through the `src/save` localStorage layer — always build a new one in a setter, never mutate in place.
- All user-facing strings (including aria-labels) go through i18next with typed keys — add to `src/i18n/locales/en.ts` and `haw.ts`; a missing key is a compile error.
- Styling uses design tokens (`src/styles/tokens.css`) and shared `.btn` classes; unit "layout tests" enforce token usage, so no hardcoded hex in component CSS.
- Dev affordances (the "Apply modifiers" panel, boss/voucher pickers, the Scoring Trace panel) render only in dev builds — use them to visually verify changes via `yarn start`.

**AI advisor.** Two independent advisors share one candidate spine (`src/ai/getHandOptions.ts` enumerates legal moves, `simulatePlay` scores them deterministically, `ModelState` projects the store): a prompted-LLM coach (`src/ai/advisor/` → the `/api/advice` Vercel function in `api/advice.ts`) and an in-browser ONNX policy (`src/ai/policy.ts`, models in `public/models/`) used for autopilot and pre-ranking. The engine owns legality and arithmetic; the model only picks an index into the vetted candidate list and never computes a number. Offline training lives in `ml/` (Python) with dataset/teacher scripts in `scripts/`.

# Testing

- Unit tests should only have one assertion per test unless they're testing a multistep flow.
- Full-app integration tests that mount `<App />` and exercise a sequence of user interactions SHOULD use multiple assertions per test when those assertions all describe the same end-state. The mount + userEvent setup is the expensive part (~300ms each); sharing one mount across related assertions cuts wall-clock cost without losing intent. The test name should describe the scenario (e.g. "Round Won modal reward breakdown for a Small Blind win with gold + interest"), not each individual assertion.
- All tests should be run after major changes.
- Include "negative" test cases whenever possible.
- Do not add comments to tests.
- When a single test file approaches 1500 lines or more, create a follow up issue to see if it can be split into something smaller.
- Whenever possible, visually verify your changes in a browser.

# Style

- Do not add comments to code, especially CSS.
- Never reference issue numbers anywhere in source code — comments, test/describe names, file names, etc. Tying source to an issue number is an anti-pattern: describe the behavior instead (e.g. `test("Skip-tag flow", ...)`, not `test("Skip-tag flow (#697)", ...)`).

# Semantic commits

Use semantic (or Conventional) Commits to provide a standardized framework for naming git commits.

# Git & Worktrees

- One worktree per branch/PR, created at `~/.cache/browslatro-worktrees/<branch>` (outside the project tree). Run `yarn install` in every fresh worktree before anything else.
- Never edit files in a checkout whose current branch is `main` — a PreToolUse hook (`.claude/hooks/worktree-guard.sh`) denies such edits. Create the worktree first, then edit the worktree copy.
- Before editing, verify you are in the right tree: `git rev-parse --show-toplevel` and `git branch --show-current` must match the issue/branch being worked. Re-verify after switching tasks.
- When a session juggles multiple issues, never reuse another issue's worktree; each issue gets its own.

# Work with feature branches

- When creating a new issue, in addition to using semantic naming, set GitHub's native issue type (one of: `Bug`, `Feature`, `Task`, `Refactor`, `Chore`) and add a label for the feature space (e.g. shop). Do not use labels for the issue type.
- When asked to complete a task, first create a new branch based on the issue number and title. Do not commit directly to main. Create a pull request when done.
- Don't escape backtick literals (\`) in PR descriptions
- Always merge/rebase main before pushing new code, including every update to existing branches/PRs.
- After every push, wait for the CI status. If a test fails or a merge conflict exists, try to resolve it immediately.
- Never merge a PR unless all CI statuses are green.
- Always leave a comment on the issue to indicate work on an issue has started.
- Drive each issue all the way to a green PR. Do not stop after pushing — confirm CI passes. Only pause if genuinely blocked; state the blocker explicitly.

# Conversations outside of Claude code

See docs/conversation_summary.md for more background.

# Documentation

Consult these before diving into unfamiliar areas — they're kept current and cross-linked.

## Onboarding (`docs/onboarding/`)

Quick intros into how the application is structured. Start at `docs/onboarding/README.md`.

- `architecture.md` — boot order, the Zustand state store, the React hooks driving the game loop, and how a click flows to a re-render.
- `scoring-pipeline.md` — the full scoring path from "which cards count" to the final floored integer; the hardest part of the codebase.
- `jokers-and-content.md` — the 150-joker catalog and the "effects as data, pure engines as code" pattern used for most game content.
- `animations.md` — how the staged scoring animation (chips/mult ticking, card pops, joker pulses) is built.
- `patterns.md` — recurring idioms and conventions (Zustand slices, etc.).

## AI/ML advisor (`docs/ai-advisor/`)

How Browslatro suggests moves to the player — both the prompted LLM coach and the offline-trained ONNX policy. Start at `docs/ai-advisor/README.md` (end-to-end overview).

- `engine-plumbing.md` — the deterministic engine half: turning a live position into scored candidate moves and a numeric feature vector. Both advisor paths sit on top of this.
- `llm-advisor.md` — the Claude-powered advisor in `src/ai/advisor/` (recommendation + explanation + alternative + concept).
- `api-layer.md` — the server-side `/api/advice` Vercel function: rate limiting, secrets, error codes, client contract.
- `wiki-retrieval.md` — how the prompted advisor is grounded with curated Balatro notes (`src/ai/advisor/wiki.ts`).
- `ml-pipeline.md` — the offline pipeline: headless play, datasets, training, evaluation, ONNX export.
- `running-locally.md` — exercising each advisor piece locally (JS/TS via Yarn; `ml/` via Python).
- `remote-training.md` — running CPU-bound dataset generation across rented Fly.io machines (shard planner, S3/Tigris transport, orchestrator).
- `outcome-teacher-progress.md` — work-in-progress handoff notes for the outcome-teacher/on-policy experiments (not shipped).
- `glossary.md` — domain terms (Balatro mechanics, ML, infrastructure) with authoritative links.

See also `src/ai/advisor/model.ts` for the advisor `MODEL_ID` and `ml/README.md` for the canonical ML workflow.

## Project Environment

- This project uses **Yarn Berry with `nodeLinker: pnpm`** (not npm). Use `yarn` commands, not `npm`. `node_modules` is generated per checkout (hardlinked from the global Yarn store) — run `yarn install` in every fresh clone or worktree before anything else.
- TypeScript is the primary language - all new code should be `.ts`/`.tsx`.
- Run `yarn typecheck` and `yarn test` before opening PRs.
- Use `import`, not `require()` — this is an ESM project.
