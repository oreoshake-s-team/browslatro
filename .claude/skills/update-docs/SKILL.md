---
name: update-docs
description: Update files under docs/ to reflect the most recently merged PR on main. Use when the user invokes /update-docs after a merge, or when they ask to "sync docs" / "update docs for the last merge". Pulls the latest merged PR via gh, inspects its diff against docs/, and proposes targeted edits — never writes speculative documentation.
---

# update-docs

Sync the project's `docs/` folder with the most recently merged pull request on `main`. The skill is manual — the user runs `/update-docs` after a merge.

## Hard rules

- Only touch files inside `docs/`. Do **not** modify `README.md`, `CLAUDE.md`, `CHANGELOG.md`, or source code.
- Never invent documentation for behavior the PR didn't change. If nothing in `docs/` is affected, say so and stop.
- One `docs/` edit per logical doc change; prefer editing existing files over creating new ones.
- Match the existing style of `docs/conversation_summary.md` (section headings, fenced code blocks, no emojis, no trailing summaries).
- Adhere to project rules in `.claude/CLAUDE.md`: no comments in code samples beyond what the existing doc uses; strict TypeScript in examples; semantic.

## Procedure

### 1. Identify the merged PR

Run, in order, and stop at the first that yields a result:

```bash
gh pr list --state merged --base main --limit 1 --json number,title,mergedAt,headRefName,body,url
```

If `gh` is not authenticated or the repo has no remote PRs, fall back to:

```bash
git log -1 --merges --first-parent main --pretty='%H%n%s%n%b'
```

Confirm the PR number and title with the user in one short sentence before proceeding (e.g., "Syncing docs for #373 — render shop inline in hand slot. Proceed?"). If the user has just merged it themselves in this session and the number is unambiguous, skip the confirmation.

### 2. Inspect what actually changed

```bash
gh pr diff <PR_NUMBER> --name-only
gh pr view <PR_NUMBER> --json body,title,labels
```

For each non-test, non-CSS, non-config source file in the diff, decide whether it represents:

- **Architecture or data-model change** → may belong in `docs/conversation_summary.md` under the matching section.
- **New feature surface** (new component, new gameplay system) → may warrant a new heading in `conversation_summary.md` or a new file under `docs/<feature>.md`.
- **Bug fix / refactor with no behavioral change** → usually no doc update. Skip.

Default bias: **skip**. Only update docs when the PR genuinely changed something a future reader of `docs/` would need to know.

### 3. Locate the affected doc sections

```bash
grep -nE '^## ' docs/*.md
```

Map PR-touched code areas to existing doc sections by keyword (e.g., a change to scoring → "Scoring Pipeline" section). Read the section in full before editing — don't patch partial sentences.

### 4. Propose edits

Before writing, show the user a brief list:

```
docs/conversation_summary.md
  - Section "Scoring Pipeline": update step 3 to mention held-card retrigger
  - Generated date: bump to today
```

Wait for approval, then apply via `Edit`. Update the `> Generated:` date at the top of any file you modify to today's date (available in the session context as `currentDate`).

### 5. Verify

- Re-read each edited section to confirm it reads naturally end-to-end.
- Run `yarn build` only if a code sample was changed and the user requests verification — otherwise docs changes don't need a build.

### 6. Report

One or two sentences: which files changed, which sections, and the PR number. No trailing summary beyond that.

## When to do nothing

- The merged PR is a docs-only change (already updated itself).
- The PR is a dependency bump, CI tweak, test-only change, or pure refactor.
- The PR's behavioral change is already accurately described in `docs/`.

In those cases, report "No `docs/` updates needed for #NNN — <one-line reason>" and exit.
