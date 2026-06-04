#!/usr/bin/env bash
# Run a command from a worktree, temporarily moving the parent (main) checkout's
# .pnp.cjs and .pnp.loader.mjs aside so vitest workers don't hit the
# "controlled by multiple pnpapi instances" collision. Restores them on exit,
# even on Ctrl-C or crash.
#
# Usage:
#   scripts/wtest.sh yarn test --run
#   scripts/wtest.sh yarn e2e
#
# Multi-agent caveat: if two worktrees run wtest at the same time, the second
# starter sees no .pnp.cjs to swap (the first already swapped it). When the
# first finishes and restores, the parent's PnP reappears mid-run for the
# second. For now, prefer running wtest in one worktree at a time.

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 2
fi

PARENT_DIR=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
HERE=$(git rev-parse --show-toplevel)

if [ "$HERE" = "$PARENT_DIR" ]; then
  exec "$@"
fi

PARENT_PNP_CJS="$PARENT_DIR/.pnp.cjs"
PARENT_PNP_LOADER="$PARENT_DIR/.pnp.loader.mjs"
BAK_SUFFIX=".wtest-bak.$$"

restore() {
  [ -f "$PARENT_PNP_CJS$BAK_SUFFIX" ]    && mv "$PARENT_PNP_CJS$BAK_SUFFIX"    "$PARENT_PNP_CJS"    || true
  [ -f "$PARENT_PNP_LOADER$BAK_SUFFIX" ] && mv "$PARENT_PNP_LOADER$BAK_SUFFIX" "$PARENT_PNP_LOADER" || true
}
trap restore EXIT INT TERM

[ -f "$PARENT_PNP_CJS" ]    && mv "$PARENT_PNP_CJS"    "$PARENT_PNP_CJS$BAK_SUFFIX"
[ -f "$PARENT_PNP_LOADER" ] && mv "$PARENT_PNP_LOADER" "$PARENT_PNP_LOADER$BAK_SUFFIX"

"$@"
