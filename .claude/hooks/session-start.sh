#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if ! command -v vp >/dev/null 2>&1; then
  curl -fsSL https://vite.plus | VP_NODE_MANAGER=no bash >&2
  echo ". \"$HOME/.config/vite-plus/env\"" >>"$CLAUDE_ENV_FILE"
  . "$HOME/.config/vite-plus/env"
fi

cd "$CLAUDE_PROJECT_DIR"
vp env on >&2
vp install --frozen-lockfile >&2

echo "export PATH=\"\$HOME/.fly/bin:\$PATH\"" >>"$CLAUDE_ENV_FILE"
.claude/hooks/flyctl.sh version >&2
