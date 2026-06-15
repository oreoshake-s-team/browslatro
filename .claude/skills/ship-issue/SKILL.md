---
name: ship-issue
description: Implement a GitHub issue end-to-end — create worktree/branch, implement, test, open PR, confirm green CI. Use when the user says "implement issue #N" or "ship issue #N".
---

# ship-issue

Implement a GitHub issue from start to a merge-ready green PR. Drive the entire loop autonomously; only pause for genuine blockers or ambiguous requirements.

## Hard rules

- Never commit directly to `main`. Always work in a worktree + branch.
- Match authentic Balatro behavior exactly — do not invent placeholder effects.
- Before acting on any ambiguous term (e.g. "tags", "modifiers", "packs"), restate what the issue covers in one line and flag terms that could be a game concept vs. a GitHub/tooling concept.
- Keep app code changes under 150 lines. If the implementation would exceed that, split into sub-issues and create follow-up tasks before proceeding.
- Use `import`, not `require()`.

## Procedure

### 1. Start

Prefer the `gh` CLI for all GitHub API calls.

### 2. Create a worktree and branch

Branch name: `<N>-<kebab-title>` (e.g. `432-add-steel-card`).
Worktree path: `~/.cache/browslatro-worktrees/<branch-name>` (outside the project tree so vitest workers don't hit a parent `.pnp.cjs`).

```bash
mkdir -p ~/.cache/browslatro-worktrees
git worktree add ~/.cache/browslatro-worktrees/<branch> -b <branch> main
```

### 3. Implement

- Read the relevant source files before editing.
- Write strict TypeScript — no `any`, no `require()`.
- Keep each changed file under 150 lines of app code.
- Add or update CSS in the component's own CSS file; do not add inline styles.

### 4. Test

```bash
time yarn typecheck
time yarn test
time yarn e2e
```

Fix all type errors and test failures before proceeding. Add new tests covering:

- The happy path
- At least one negative / edge case

One assertion per test unless testing a multi-step flow.

### 5. Commit

Semantic commit message (e.g. `feat(cards): add Steel enhancement`). Create new commits for any back and forth changes, do not squash any updates.

### 6. Push and open PR

```bash
git push -u origin <branch>
```

- Ensure that no escaped backticks make it into the PR description.
- Always use language that will close out any existing issue when applicable.

### 7. Add Vercel preview URL

After the PR is created, fetch the Vercel preview URL for the branch and add it to the PR body.

If the Vercel MCP tool `mcp__vercel__list_deployments` is available, use it to find the deployment for this branch. Poll until the deployment state is `READY` (retry up to ~10 times with a short delay). Then edit the PR body to append:

```
## Preview
[Vercel Preview](<url>)
```

Use `mcp__github__update_pull_request` to update the PR body.

If the Vercel MCP tool is not loaded, Vercel is not connected to this repo, or the deployment is not found after polling, try to extract the URL from the pull request.

### 8. Include screenshots (if applicable)

When making UI changes, provide a before and after picture of things that have changed. Use a headless chrome to perform this task.

### 9. Rebase loop

```bash
git fetch origin main
git rebase origin/main
git push --force-with-lease
```

Repeat until `git status` shows 0 commits behind `origin/main`.

### 10. Wait for CI

Poll CI with the GitHub MCP — `gh` is not installed in web sessions. Use `mcp__github__pull_request_read` (or `mcp__github__actions_list` / `mcp__github__actions_get` for the branch's workflow runs) to read check status. Re-poll with a short delay until every check has concluded.

Fall back only if the MCP is unavailable:

```bash
gh run watch
```

If any check fails: diagnose, fix, push a new commit, and re-poll. Do not stop until all checks are green.

### 11. Report

One sentence: PR number, Vercel preview link, and CI status as they become available. Always use links instead of issue/PR numbers alone.

## When to pause

- Issue requirements are genuinely ambiguous after reading the issue body.
- Implementation would exceed 150 lines — create sub-issues first.
- A test failure requires a design decision outside the issue scope.

State the blocker in one sentence; do not stop silently.
