# Browlatro

Browlatro is an educational journey meant to help the author brush up on their frontend skills. The author is still learning react and struggles with CSS.

## Game Domain Context

- This is a Balatro clone. Terms like 'tags', 'spectral cards', 'vouchers', 'boss blinds', etc. refer to **in-game Balatro mechanics**, not GitHub/repo concepts.
- When implementing Balatro features (spectral cards, tarots, jokers, etc.), match the **authentic Balatro effects** - do not invent placeholder effects. Reference the Balatro wiki or ask the user if unsure.

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
- Always use ISSUE_TEMPLATE.md when creating issues.
- Use yarn for all package management and script execution (e.g. `yarn install`, `yarn test`, `yarn build`). Do not use npm.

# Testing

- Tests should only have one assertion per test unless it is testing a multistep flow.
- All tests should be run after major changes.
- Include "negative" test cases whenever possible.
- Do not add comments to tests.
- When a single test file approaches 1500 lines or more, create a follow up issue to see if it can be split into something smaller.
- Whenever possible, visually verify your changes in a browser.

# Style

- Do not add comments to code, especially CSS.

# Semantic commits

Use semantic (or Conventional) Commits to provide a standardized framework for naming git commits.

# Work with feature branches

- When creating a new issue, in addition to using semantic naming, add GitHub tags for the issue type and feature space (e.g. shop).
- When asked to complete a task, first create a new branch based on the issue number and title. Do not commit directly to main. Create a pull request when done.
- Don't escape backtick literals (\`) in PR descriptions
- Always merge/rebase main before pushing new code, including every update to existing branches/PRs.
- After every push, wait for the CI status. If a test fails or a merge conflict exists, try to resolve it immediately.
- Never merge a PR unless all CI statuses are green.
- Always leave a comment on the issue to indicate work on an issue has started.
- Drive each issue all the way to a green PR. Do not stop after pushing — confirm CI passes. Only pause if genuinely blocked; state the blocker explicitly.

# Conversations outside of Claude code

See docs/conversation_summary.md for more background.

## Project Environment

- This project uses **Yarn Berry with PnP** (not npm/node_modules). Use `yarn` commands, not `npm`. Never assume a `node_modules` directory exists.
- TypeScript is the primary language - all new code should be `.ts`/`.tsx`.
- Run `yarn typecheck` and `yarn test` before opening PRs.
- Use `import`, not `require()` — this is an ESM project.
