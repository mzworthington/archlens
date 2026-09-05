# Getting started

This page is for **using** ArchLens. Start with the demo, try a browser scan for structure, then install the CLI when you need TraceLens/git forensics or CI publish. For hacking on the repo itself, see [Setup & local development](../setup.md).

## 1. Try the demo

Open the hosted app:

**[https://archlens.dev/workspace](https://archlens.dev/workspace)**

Bare `/workspace` opens the **startup chooser** (nothing loads until you pick an option). Choose an intent: **Investigate** (scan, open folder, IaC import), **Collaborate** (share blank / folder / file) or **Ideate** (solo blank canvas or import Mermaid). The chooser also has **Try the demo** and a collapsed **Full analysis** CLI strip. New here? Use **Try the demo** to open the golden journey with **ChaosLens**, so you can simulate a failure and jump to ranked **AdviceLens** recommendations before configuring anything locally.

## 2. Scan in the browser

From the same startup chooser, under **Investigate**, select **Browser lite scan** and pick a source folder.

This uses the browser File System Access API and shared `@archlens/analysis` domain logic to generate structural BlueprintSpec in memory. It is intentionally a **lite / structure-only** preview: application languages (`ts`/`tsx`/`js`/`cs`/`java`/`go`/`py`) plus Terraform/Pulumi via the same `IacAnalyzer` pass as the CLI - **no** TraceLens git hotspots and **no** CI publish.

After the scan you can **Save to folder** (or **Download YAML**). A writable folder then uses the same draft/commit flow as any other blueprints workspace. Decline and the map stays in memory. TraceLens in this tab will not claim git hotspots exist.

Use this path for fast first feedback without installing anything. For in-depth knowledge (git forensics, watch mode, catalog publish), install and run the ArchLens CLI in the next step.

## 3. Install ArchLens CLI

### macOS / Linux (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | bash
```

This downloads the latest release for your platform, installs `archlens` to `~/.local/bin` and copies tree-sitter WASM parsers alongside the binary.

Options (pass to `bash -s --` when piping):

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | bash -s -- --version v0.1.5
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | bash -s -- --dir "$HOME/bin"
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

## 4. Manual install (fallback)

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

## 5. Scan a codebase with the CLI

From the root of the project you want to map:

```bash
cd /path/to/your/repo
archlens
```

Interactive mode prompts for parser, glob, output directory and TraceLens (git signals, on by default).

Headless / CI example:

```bash
archlens --headless --glob="**/*.{ts,tsx}" --output="blueprints"
```

Useful flags: `--no-git` to skip TraceLens, `--git-since=90` for lookback, `--output` for the YAML folder. More detail: [ArchLens CLI](./cli.md).

The CLI writes diagrams under `blueprints/` (or your `--output` path): context, containers and components.

Each file uses the [v4 BlueprintSpec format](./schema.md) - `version` is the public schema URL, identity lives under `metadata`. For IDE autocomplete in other repos, prefer the **latest** BlueprintSpec:

```yaml
# yaml-language-server: $schema=https://archlens.dev/schemas/latest/blueprint.schema.json
```

## 6. Open generated blueprints in Canvas

Open the hosted app:

**[https://archlens.dev/workspace](https://archlens.dev/workspace)**

(Or use **Open app** from this docs site.)

On first open you get a **startup chooser** on bare `/workspace`:

1. Pick an intent: **Investigate** (lite scan, open folder, IaC import, CLI), **Collaborate** (share blank / folder / file) or **Ideate** (solo blank canvas or import Mermaid).
2. Or use the secondary **Try the demo** strip - explore the bundled golden journey and simulate a failure (lands in ChaosLens).
3. Use the system switcher and C4 zoom to explore context → container → component.
4. Inspect **TraceLens** signals - open Explorer → **TraceLens** on selected nodes, or **View worst offenders** for the estate ranking page (CLI scans only).
5. Toggle **ChaosLens** from the bottom toolbar (**Resilience** button) to simulate faults on the active diagram - see [ChaosLens](./chaoslens.md).
6. Optionally **Import Mermaid** from Ideate, **Import Infrastructure** from Investigate or either from the toolbar **Open** menu - see [ArchLens Canvas](./canvas.md#import-mermaid).

Deep links (`/workspace/blueprint`, etc.) skip the chooser and bootstrap the demo so the matching diagram resolves.

You can also run a local build of ArchLens Canvas when contributing to this repository - see [Setup & local development](../setup.md). The app is installable as a PWA for offline editing of a local workspace.

## Next

- [Jobs for today](./jobs.md)
- [ArchLens Canvas](./canvas.md)
- [ArchLens CLI](./cli.md)
- [TraceLens](./tracelens.md)
- [ChaosLens](./chaoslens.md)
- [Interface tour & journeys](../journeys.md)
