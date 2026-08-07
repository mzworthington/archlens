#!/usr/bin/env bash
# Idempotent local / Cursor Cloud bootstrap: mise → node/pnpm → pnpm install.
# Optional: clone agent-lifecycle-kit into ~/.agents (SKIP_LIFECYCLE_KIT=1 to skip).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v mise >/dev/null 2>&1; then
  curl -fsSL https://mise.run | sh
  export PATH="${HOME}/.local/bin:${PATH}"
fi

eval "$(mise activate bash --shims)"
mise install node pnpm

# Marker for shells that source activation once.
# react-cloudflare-template mise activation

pnpm install

ensure_lifecycle_kit() {
  if [[ "${SKIP_LIFECYCLE_KIT:-}" == "1" ]]; then
    echo "Skipping agent-lifecycle-kit (SKIP_LIFECYCLE_KIT=1)"
    return 0
  fi
  if [[ -e "${HOME}/.agents" ]]; then
    echo "Lifecycle kit present at ~/.agents"
    return 0
  fi
  local dest="${HOME}/.cache/agent-lifecycle-kit"
  if [[ ! -d "$dest/.git" ]]; then
    git clone --depth 1 https://github.com/mzworthington/agent-lifecycle-kit.git "$dest"
  fi
  if [[ -x "$dest/install.sh" ]]; then
    (cd "$dest" && ./install.sh)
  else
    ln -sfn "$dest" "${HOME}/.agents"
  fi
}

ensure_lifecycle_kit

echo "Dev environment ready. Run: pnpm dev"
