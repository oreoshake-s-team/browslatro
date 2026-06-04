#!/usr/bin/env bash
# List or remove git worktrees whose branch is fully merged into origin/main.
# Dry-run by default; pass --yes to actually remove.
#
# Usage:
#   scripts/wt-prune.sh         # show what would be removed
#   scripts/wt-prune.sh --yes   # actually remove
#
# Refuses to remove worktrees with uncommitted changes (omit --force on purpose).
# Skips the main checkout and any worktree currently checked out to main.

set -euo pipefail

mode=dry
if [ "${1:-}" = "--yes" ]; then
  mode=apply
elif [ -n "${1:-}" ]; then
  echo "usage: $0 [--yes]" >&2
  exit 2
fi

git fetch origin main --quiet 2>/dev/null || true

merged_set=""
if command -v gh >/dev/null 2>&1; then
  merged_set=$(gh pr list --state merged --limit 500 --json headRefName --jq '.[].headRefName' 2>/dev/null || true)
fi

is_merged() {
  local bname="$1" br="$2"
  if [ -n "$merged_set" ] && printf '%s\n' "$merged_set" | grep -Fxq "$bname"; then
    return 0
  fi
  git merge-base --is-ancestor "$br" origin/main 2>/dev/null
}

removed=0
kept=0

while IFS=$'\t' read -r wt br; do
  bname="${br#refs/heads/}"
  if [ "$bname" = "main" ] || [ -z "$bname" ]; then
    continue
  fi
  if ! is_merged "$bname" "$br"; then
    kept=$((kept + 1))
    continue
  fi
  if [ "$mode" = "apply" ]; then
    if git worktree remove "$wt" 2>/dev/null; then
      echo "removed $wt ($bname)"
      removed=$((removed + 1))
    else
      echo "skipped $wt ($bname): uncommitted changes; use 'git worktree remove --force $wt' if intentional"
    fi
  else
    echo "would remove $wt ($bname)"
    removed=$((removed + 1))
  fi
done < <(git worktree list --porcelain | awk '
  /^worktree / { wt=$2; br="" }
  /^branch /   { br=$2 }
  /^$/         { if (wt) print wt "\t" br; wt=""; br="" }
  END          { if (wt) print wt "\t" br }
')

echo ""
if [ "$mode" = "dry" ]; then
  echo "$removed merged worktree(s) eligible for removal; $kept active worktree(s) untouched."
  echo "Pass --yes to remove."
else
  echo "$removed merged worktree(s) removed; $kept active worktree(s) untouched."
fi
