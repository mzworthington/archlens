# Getting started

This page is for **using** ArchLens - install ArchLens, scan a codebase, then open ArchLens Canvas. For hacking on the repo itself, see [Setup & local development](../setup.md).

## 1. Install ArchLens

### macOS / Linux (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | sh
```

This downloads the latest release for your platform, installs `archlens` to `~/.local/bin`, and copies tree-sitter WASM parsers alongside the binary.

Options (pass to `sh -s --` when piping):

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | sh -s -- --version v0.1.5
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | sh -s -- --dir "$HOME/bin"
```

### Windows

```powershell
irm https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.ps1 | iex
```

### Verify

```bash
archlens --version
archlens --help
```

## 2. Manual install (fallback)

Grab the latest release from GitHub:

**[https://github.com/mzworthington/archlens/releases/latest](https://github.com/mzworthington/archlens/releases/latest)**

| Platform            | Asset                         |
| ------------------- | ----------------------------- |
| macOS Apple Silicon | `archlens-macos-arm64.tar.gz` |
| macOS Intel         | `archlens-macos-x64.tar.gz`   |
| Linux x64           | `archlens-linux-x64.tar.gz`   |
| Windows x64         | `archlens-windows-x64.zip`    |

### macOS / Linux

```bash
# Example: Apple Silicon macOS - adjust the filename for your platform
curl -fsSL -o archlens.tar.gz \
  https://github.com/mzworthington/archlens/releases/latest/download/archlens-macos-arm64.tar.gz

tar -xzf archlens.tar.gz
chmod +x archlens

mkdir -p "$HOME/.local/bin"
mv archlens tree-sitter*.wasm "$HOME/.local/bin/"
# Ensure ~/.local/bin is on PATH (add to ~/.zshrc / ~/.bashrc if needed):
# export PATH="$HOME/.local/bin:$PATH"
```

### Windows

1. Download `archlens-windows-x64.zip` from the latest release.
2. Extract `archlens.exe` and the `tree-sitter*.wasm` files together.
3. Move them to a folder on your `PATH` (for example `C:\Users\<you>\.local\bin`), or add that folder to **Environment Variables → Path**.

## 3. Scan a codebase

From the root of the project you want to map:

```bash
cd /path/to/your/repo
archlens
```

Interactive mode prompts for parser, glob, output directory, and TraceLens (git signals, on by default).

Headless / CI example:

```bash
archlens --headless --glob="**/*.{ts,tsx}" --output="blueprints"
```

Useful flags: `--no-git` to skip TraceLens, `--git-since=90` for lookback, `--output` for the YAML folder. More detail: [ArchLens](./cli.md).

The CLI writes diagrams under `blueprints/` (or your `--output` path): context, containers, and components.

Each file uses the [v4 BlueprintSpec format](./schema.md) - `version` is the public schema URL, identity lives under `metadata`. For IDE autocomplete in other repos, prefer the **latest** BlueprintSpec:

```yaml
# yaml-language-server: $schema=https://archlens.dev/schemas/latest/blueprint.schema.json
```

## 4. Open ArchLens Canvas

Open the hosted app:

**[https://archlens.dev/workspace](https://archlens.dev/workspace)**

(Or use **Open app** from this docs site.)

On first open you get a **startup chooser** on bare `/workspace`:

1. **Load sandbox** - clear local drafts/cache and explore the bundled demo diagrams (shipped in the app build).
2. **Open workspace from directory** - pick the folder that contains your generated `blueprints/` YAML.
3. Use the system switcher and C4 zoom to explore context → container → component.
4. Inspect **TraceLens** signals — open Explorer → **TraceLens** on selected nodes, or **View worst offenders** for the estate ranking page.
5. Toggle **ChaosLens** from the bottom toolbar (**Resilience** button) to simulate faults on the active diagram - see [ChaosLens](./chaoslens.md).
6. Optionally **Import Mermaid** (startup or toolbar **Open** menu) to merge an external diagram into the active schema - see [ArchLens Canvas](./canvas.md#import-mermaid).

Deep links (`/workspace/blueprint`, etc.) skip the chooser and open the matching diagram directly.

You can also run a local build of ArchLens Canvas when contributing to this repository - see [Setup & local development](../setup.md). The app is installable as a PWA for offline editing of a local workspace.

## Next

- [ArchLens Canvas](./canvas.md)
- [ArchLens](./cli.md)
- [TraceLens](./tracelens.md)
- [ChaosLens](./chaoslens.md)
- [Interface tour & journeys](../journeys.md)
