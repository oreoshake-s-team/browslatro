# Browlatro

Browlatro is an educational journey meant to help the author brush up on their frontend skills. The author is still learning react and struggles with CSS.

# Hard requirements

- Squash all PRs into a single commit instead of merging/rebasing.
- All functionality must have test coverage
- Ensure there are no typescript issues before committing
- If a change requires more than 150 lines of changes to application code (excluding CSS, tests, config, etc), split it up into multiple changes and create followup tasks.
- Code should be as compartmenatalized as possible, including CSS
- Code should be written in strict typescript, no use of any types
- Only use strict typescript. No use of JS or "any" types
- Prioritize accessibility and i18n
- When developing new branches, work in worktrees
- Always use ISSUE_TEMPLATE.md when creating issues
- Use yarn for all package management and script execution (e.g. `yarn install`, `yarn test`, `yarn build`). Do not use npm.

# Testing

- Tests should only have one assertion per test unless it is testing a multistep flow
- All tests should be run after major changes
- Include "negative" test cases whenever possible
- Do not add comments to tests.

# Style

- Do not add comments to code, especially CSS

# Semantic commits

Use semantic (or Conventional) Commits to provide a standardized framework for naming git commits

# Work with feature branches

When asked to complete a task, first create a new branch based on the issue number and title. Do not commit directly to main. Create a pull request when done.

Always merge main before pushing new code.

After every push, wait for the CI status. If a test fails or a merge conflict exists, try to resolve it immediately.

# Conversations outside of Claude code

See docs/conversation_summary.md for more background
