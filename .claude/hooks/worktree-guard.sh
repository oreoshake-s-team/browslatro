#!/usr/bin/env bash
set -uo pipefail

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -z "$file_path" ] && exit 0

case "$file_path" in
  */.claude/*) exit 0 ;;
esac

dir=$(dirname "$file_path")
while [ -n "$dir" ] && [ "$dir" != "/" ] && [ ! -d "$dir" ]; do
  dir=$(dirname "$dir")
done
[ -d "$dir" ] || exit 0

branch=$(git -C "$dir" branch --show-current 2>/dev/null)
[ "$branch" = "main" ] || exit 0

if git -C "$dir" check-ignore -q "$file_path" 2>/dev/null; then
  exit 0
fi

repo_root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)
jq -n --arg reason "Edit blocked: $file_path is inside a checkout on 'main' ($repo_root). Never edit a checkout on main. Create a worktree first: git worktree add ~/.cache/browslatro-worktrees/<branch> -b <branch> origin/main, run yarn install there, then edit the worktree copy." \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'
exit 0
