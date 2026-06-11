# Browlatro

Browlatro is an educational journey meant to help the author brush up on their frontend skills. The author is still learning react and struggles with CSS.

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

# Hard requirements

- Squash all PRs into a single commit instead of merging/rebasing.
- All functionality must have test coverage.
- Ensure there are no typescript issues before committing.
- If a change requires more than 150 lines of changes to application code (excluding CSS, tests, config, etc), split it up into multiple changes and create followup tasks.
- Code should be as compartmenatalized as possible, including CSS.
- Code should be written in strict typescript, no use of any types.
- Only use strict typescript. No use of JS or "any" types.
- Prioritize accessibility and i18n.
- When developing new branches, work in worktrees.
- Always use the issue template at `.github/ISSUE_TEMPLATE/issue.yml` when creating issues.
- Use yarn for all package management and script execution (e.g. `yarn install`, `yarn test`, `yarn build`). Do not use npm.

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

# Onboarding

See docs/onboarding/* for quick intros into how the application is structured.

## Project Environment

- This project uses **Yarn Berry with `nodeLinker: pnpm`** (not npm). Use `yarn` commands, not `npm`. `node_modules` is generated per checkout (hardlinked from the global Yarn store) — run `yarn install` in every fresh clone or worktree before anything else.
- TypeScript is the primary language - all new code should be `.ts`/`.tsx`.
- Run `yarn typecheck` and `yarn test` before opening PRs.
- Use `import`, not `require()` — this is an ESM project.
