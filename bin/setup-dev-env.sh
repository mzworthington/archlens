#!/usr/bin/env bash
# Idempotent toolchain bootstrap for local and Cursor Cloud agents.
# Installs mise (if needed), core tools from mise.toml (node/pnpm/bun/go),
# app dependencies, and ChaosLens WASM. Skips heavy docs-media tools
# (ffmpeg/vhs) - install those with a full `mise install` when needed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MISE_BIN="${HOME}/.local/bin/mise"
ensure_mise() {
  if command -v mise >/dev/null 2>&1; then
    return 0
  fi
  if [[ -x "$MISE_BIN" ]]; then
    export PATH="${HOME}/.local/bin:${PATH}"
    return 0
  fi
  echo "▶ Installing mise…"
  curl -fsSL https://mise.run | sh
  export PATH="${HOME}/.local/bin:${PATH}"
}

activate_mise_shell() {
  # Shims keep tools on PATH for non-interactive agent shells.
  export PATH="${HOME}/.local/share/mise/shims:${HOME}/.local/bin:${PATH}"
  if [[ -x "$MISE_BIN" ]]; then
    eval "$("$MISE_BIN" activate bash --shims)"
  elif command -v mise >/dev/null 2>&1; then
    eval "$(mise activate bash --shims)"
  fi

  local marker='# archlens mise activation'
  local bashrc="${HOME}/.bashrc"
  if [[ -f "$bashrc" ]] && grep -Fq "$marker" "$bashrc"; then
    return 0
  fi
  {
    echo ""
    echo "$marker"
    echo 'export PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH"'
    echo 'command -v mise >/dev/null 2>&1 && eval "$(mise activate bash --shims)"'
  } >>"$bashrc"
  echo "✓ Wrote mise activation to ${bashrc}"
}

install_core_tools() {
  # Explicit list so agents get bun (required for CLI build) without
  # pulling optional docs-media binaries (ffmpeg/vhs).
  echo "▶ mise install node pnpm bun go"
  mise install node pnpm bun go
  echo "✓ $(node -v) / pnpm $(pnpm -v) / bun $(bun -v) / go $(go env GOVERSION 2>/dev/null || go version)"
}

install_app_deps() {
  echo "▶ pnpm install (app/)"
  # Cloud/agent shells are non-TTY; avoid interactive modules-dir purge prompts.
  (cd app && CI=true pnpm install --frozen-lockfile)
}

ensure_wasm() {
  echo "▶ ChaosLens WASM"
  make -C resilience-engine ensure-wasm
}

# Resolve agent-lifecycle-kit so Cloud/local agents can use skills under ~/.agents.
# Mirrors AGENTS.md: ~/.agents → sibling checkout → /agent/repos → clone + install.sh.
# Set SKIP_LIFECYCLE_KIT=1 to skip (offline / restricted networks).
ensure_lifecycle_kit() {
  if [[ "${SKIP_LIFECYCLE_KIT:-}" == "1" ]]; then
    echo "⏭ Skipping agent-lifecycle-kit (SKIP_LIFECYCLE_KIT=1)"
    return 0
  fi

  if [[ -d "${HOME}/.agents/skills" ]]; then
    echo "✓ Lifecycle kit at ${HOME}/.agents"
    return 0
  fi

  local kit=""
  local candidate
  for candidate in \
    "${ROOT}/../agent-lifecycle-kit" \
    "/agent/repos/agent-lifecycle-kit" \
    "${HOME}/.cache/agent-lifecycle-kit"; do
    if [[ -d "${candidate}/skills" ]]; then
      kit="$(cd "${candidate}" && pwd)"
      break
    fi
  done

  if [[ -z "${kit}" ]]; then
    local parent
    parent="$(cd "$(dirname "${ROOT}")" && pwd)"
    if [[ -d "/agent/repos" ]]; then
      kit="/agent/repos/agent-lifecycle-kit"
    elif [[ -w "${parent}" ]]; then
      kit="${parent}/agent-lifecycle-kit"
    else
      kit="${HOME}/.cache/agent-lifecycle-kit"
    fi

    if [[ ! -d "${kit}/.git" ]]; then
      echo "▶ Cloning agent-lifecycle-kit → ${kit}"
      mkdir -p "$(dirname "${kit}")"
      git clone --depth 1 https://github.com/mzworthington/agent-lifecycle-kit.git "${kit}"
    fi
  fi

  if [[ ! -e "${HOME}/.agents" ]]; then
    if [[ -x "${kit}/install.sh" ]]; then
      echo "▶ Linking ${HOME}/.agents via install.sh"
      (cd "${kit}" && ./install.sh)
    else
      ln -sfn "${kit}" "${HOME}/.agents"
    fi
  elif [[ -L "${HOME}/.agents" ]]; then
    echo "✓ ${HOME}/.agents → $(readlink "${HOME}/.agents")"
  else
    echo "⚠ ${HOME}/.agents exists but has no skills/; kit checkout at ${kit}"
  fi

  if [[ -d "${HOME}/.agents/skills" ]]; then
    echo "✓ Lifecycle kit ready (${HOME}/.agents)"
  else
    echo "⚠ Lifecycle kit clone at ${kit} but ${HOME}/.agents/skills missing"
  fi
}

ensure_mise
activate_mise_shell
install_core_tools
install_app_deps
ensure_wasm
ensure_lifecycle_kit
echo "✓ Dev environment ready (bun on PATH for CLI build)"
