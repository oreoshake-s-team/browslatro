---
name: verify-pr
description: Run the full pre-PR quality gate for browslatro — typecheck, unit tests, and (when UI changed) an e2e / visual pass — before opening or updating a pull request. Use when the user says "verify", "run the gate", "is this ready to push", or before any `ship-issue` push.
---

# verify-pr

Codify the project's "run all checks before a PR" bar into one repeatable gate. Run from the worktree/branch you intend to push — never from a dirty `main`.

## Hard rules

- Every gate runs in the directory that will be pushed (a `~/.cache/browslatro-worktrees/<branch>` worktree, per the project layout). Don't run against `main`.
- A failing gate is a stop — fix the cause, don't push around it.
- `gh` is not installed in web sessions; use the GitHub MCP for any PR interaction.

## Gate (run in order, stop on first failure)

### 1. Types

```bash
yarn typecheck
```

No `any`, no type errors.

### 2. Unit tests

```bash
yarn test
```

All green. If you changed behavior, confirm the new happy-path **and** a
negative/edge case are covered before continuing.

### 3. UI / visual pass — only if rendered output changed

If the diff touches any `*.tsx` or `*.css`, do a visual check rather than
trusting unit tests alone (project rule: "visually verify in a browser"):

```bash
yarn e2e
```

For a manual look, the global `/run` or `/verify` skills can launch the app
and screenshot the affected screen. Skip this step entirely for pure
logic/test/docs changes.

### 4. Report

One or two sentences: which gates ran, pass/fail, and whether a UI pass was
needed. If everything is green, say so plainly so the caller can push.

## When to skip a step

- **Step 3** when no `*.tsx`/`*.css` changed (logic-only, docs-only, config-only).
- Never skip steps 1 or 2.
