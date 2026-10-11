#!/bin/bash
set -euo pipefail

export FLYCTL_INSTALL="${FLYCTL_INSTALL:-$HOME/.fly}"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

if ! command -v flyctl >/dev/null 2>&1 && [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  mkdir -p "$FLYCTL_INSTALL"
  (
    flock 9
    if ! command -v flyctl >/dev/null 2>&1; then
      curl -fsSL https://fly.io/install.sh | sh -s -- --non-interactive >&2
    fi
  ) 9>"$FLYCTL_INSTALL/install.lock"
fi

exec flyctl "$@"
