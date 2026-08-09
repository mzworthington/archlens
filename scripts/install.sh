#!/usr/bin/env bash
# Install ArchLens CLI from GitHub releases.
# Usage: curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | bash
# Prefer `| bash` (not `| sh`): this script needs bash features such as `pipefail`.
if [ -z "${BASH_VERSION:-}" ]; then
  echo "error: run this installer with bash, e.g.:" >&2
  echo "  curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | bash" >&2
  exit 1
fi
set -euo pipefail

GITHUB_REPO="${ARCHLENS_GITHUB_REPO:-mzworthington/archlens}"
INSTALL_DIR="${ARCHLENS_INSTALL_DIR:-}"
REQUESTED_VERSION=""
USE_SYSTEM=0
UNINSTALL=0

usage() {
  cat <<'EOF'
ArchLens CLI install script

Usage:
  install.sh [options]

Options:
  --dir <path>       Install directory (default: $HOME/.local/bin)
  --system           Install to /usr/local/bin (may require write access)
  --version <tag>    Install a specific release (e.g. v0.1.5)
  --uninstall        Remove archlens and bundled tree-sitter WASMs
  -h, --help         Show this help

Environment:
  ARCHLENS_GITHUB_REPO   GitHub owner/repo (default: mzworthington/archlens)
  ARCHLENS_INSTALL_DIR  Same as --dir
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      INSTALL_DIR="${2:-}"
      shift 2
      ;;
    --system)
      USE_SYSTEM=1
      shift
      ;;
    --version)
      REQUESTED_VERSION="${2:-}"
      shift 2
      ;;
    --uninstall)
      UNINSTALL=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

detect_platform() {
  local os arch asset
  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Darwin)
      case "$arch" in
        arm64) asset="archlens-macos-arm64.tar.gz" ;;
        x86_64) asset="archlens-macos-x64.tar.gz" ;;
        *)
          echo "Unsupported macOS architecture: $arch" >&2
          exit 1
          ;;
      esac
      ;;
    Linux)
      case "$arch" in
        x86_64) asset="archlens-linux-x64.tar.gz" ;;
        *)
          echo "Unsupported Linux architecture: $arch" >&2
          exit 1
          ;;
      esac
      ;;
    *)
      echo "Unsupported OS: $os (use scripts/install.ps1 on Windows)" >&2
      exit 1
      ;;
  esac

  printf '%s' "$asset"
}

resolve_install_dir() {
  if [[ -n "$INSTALL_DIR" ]]; then
    printf '%s' "$INSTALL_DIR"
    return
  fi
  if [[ "$USE_SYSTEM" -eq 1 ]]; then
    printf '%s' "/usr/local/bin"
    return
  fi
  printf '%s' "${HOME}/.local/bin"
}

path_contains_dir() {
  local dir="$1"
  case ":${PATH}:" in
    *":${dir}:"*) return 0 ;;
    *) return 1 ;;
  esac
}

print_path_hint() {
  local dir="$1"
  if path_contains_dir "$dir"; then
    return
  fi
  cat <<EOF

Add ArchLens CLI to your PATH:

  export PATH="${dir}:\$PATH"

Add that line to ~/.zshrc or ~/.bashrc, then restart your shell.
EOF
}

remove_install() {
  local dir="$1"
  local removed=0
  if [[ -x "${dir}/archlens" ]]; then
    rm -f "${dir}/archlens"
    removed=1
  fi
  shopt -s nullglob
  for wasm in "${dir}"/tree-sitter*.wasm; do
    rm -f "$wasm"
    removed=1
  done
  shopt -u nullglob
  if [[ "$removed" -eq 0 ]]; then
    echo "No ArchLens CLI install found in ${dir}" >&2
    exit 1
  fi
  echo "Removed ArchLens CLI from ${dir}"
}

download_release() {
  local version="$1"
  local asset="$2"
  local tmp archive url

  tmp="$(mktemp -d)"
  archive="${tmp}/${asset}"

  if [[ -n "$version" ]]; then
    url="https://github.com/${GITHUB_REPO}/releases/download/${version}/${asset}"
  else
    url="https://github.com/${GITHUB_REPO}/releases/latest/download/${asset}"
  fi

  echo "Downloading ${url}" >&2
  curl -fsSL -o "$archive" "$url"

  if [[ -n "$version" ]]; then
    verify_checksum "$archive" "$asset" "$version"
  else
    verify_checksum_latest "$archive" "$asset"
  fi

  printf '%s' "$archive"
}

verify_checksum() {
  local archive="$1"
  local asset="$2"
  local version="$3"
  local checksums_url sums_file expected actual

  checksums_url="https://github.com/${GITHUB_REPO}/releases/download/${version}/checksums.txt"
  sums_file="$(mktemp)"
  if ! curl -fsSL -o "$sums_file" "$checksums_url" 2>/dev/null; then
    rm -f "$sums_file"
    return 0
  fi

  expected="$(awk -v asset="$asset" '$2 == asset { print $1; exit }' "$sums_file")"
  rm -f "$sums_file"
  if [[ -z "$expected" ]]; then
    return 0
  fi

  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "$archive" | awk '{ print $1 }')"
  elif command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$archive" | awk '{ print $1 }')"
  else
    echo "Warning: sha256sum/shasum not found; skipping checksum verification" >&2
    return 0
  fi

  if [[ "$actual" != "$expected" ]]; then
    echo "Checksum mismatch for ${asset}" >&2
    exit 1
  fi
  echo "Checksum verified" >&2
}

verify_checksum_latest() {
  local archive="$1"
  local asset="$2"
  local api_url tag

  api_url="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
  tag="$(curl -fsSL "$api_url" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -1)"
  if [[ -z "$tag" ]]; then
    return 0
  fi
  verify_checksum "$archive" "$asset" "$tag"
}

install_files() {
  local archive="$1"
  local dir="$2"
  local tmp

  tmp="$(mktemp -d)"
  tar -xzf "$archive" -C "$tmp"
  mkdir -p "$dir"
  cp -f "${tmp}/archlens" "${dir}/archlens"
  chmod +x "${dir}/archlens"
  shopt -s nullglob
  # Includes runtime tree-sitter.wasm and language tree-sitter-*.wasm parsers.
  for wasm in "${tmp}"/tree-sitter*.wasm; do
    cp -f "$wasm" "${dir}/$(basename "$wasm")"
  done
  shopt -u nullglob
  rm -rf "$tmp"
}

main() {
  local dir asset archive

  dir="$(resolve_install_dir)"
  if [[ "$UNINSTALL" -eq 1 ]]; then
    remove_install "$dir"
    exit 0
  fi

  if [[ "$USE_SYSTEM" -eq 1 && "$EUID" -ne 0 && ! -w "/usr/local/bin" ]]; then
    echo "Warning: /usr/local/bin may not be writable; re-run with sudo or use --dir" >&2
  fi

  asset="$(detect_platform)"
  archive="$(download_release "$REQUESTED_VERSION" "$asset")"
  install_files "$archive" "$dir"
  rm -rf "$(dirname "$archive")"

  echo ""
  echo "Installed archlens to ${dir}/archlens"
  if [[ -x "${dir}/archlens" ]]; then
    echo "Version: $("${dir}/archlens" --version 2>/dev/null || echo unknown)"
  fi
  print_path_hint "$dir"
}

main "$@"
