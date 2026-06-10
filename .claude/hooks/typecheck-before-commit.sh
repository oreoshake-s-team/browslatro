#!/usr/bin/env bash
# PreToolUse(Bash) hook: run `yarn typecheck` before any `git commit`.
#
# Enforces the CLAUDE.md hard requirement "Ensure there are no typescript
# issues before committing" deterministically, so it can't be forgotten.
# Honors the project's worktree flow by detecting `git -C <dir> commit` and
# typechecking that directory; otherwise it uses the current directory.
#
# Exit 2 blocks the commit and feeds the error back to Claude.
# Remove the PreToolUse entry from .claude/settings.json to disable.
set -uo pipefail

input=$(cat)
command=$(printf '%s' "$input" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null \
  || printf '')

# Only gate actual commits.
case "$command" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

# Resolve the repo dir: respect `git -C <dir>` (worktree commits), else cwd.
target_dir=$(printf '%s' "$command" \
  | sed -n 's/.*git[[:space:]]\{1,\}-C[[:space:]]\{1,\}\([^[:space:]]*\).*/\1/p' | head -1)
target_dir=${target_dir:-$(pwd)}
# Expand a leading ~ (it came from a string, not the shell).
target_dir=${target_dir/#\~/$HOME}

# Nothing to typecheck if this isn't a JS/TS project tree.
[ -f "$target_dir/package.json" ] || exit 0

# Skip (don't block) when deps aren't installed yet — a fresh clone or worktree
# can't typecheck until `yarn install` runs, and that's not a type error.
[ -d "$target_dir/node_modules" ] || exit 0

if ! output=$(cd "$target_dir" && yarn typecheck 2>&1); then
  printf 'Blocked: `yarn typecheck` failed in %s — fix type errors before committing.\n\n' "$target_dir" >&2
  printf '%s\n' "$output" | tail -25 >&2
  exit 2
fi

exit 0
