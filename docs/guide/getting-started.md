# Getting started

This page is for **using** Blueprint — install Blueprint CLI, scan a codebase, then open Blueprint canvas. For hacking on the repo itself, see [Setup & local development](../setup.md).

## 1. Download Blueprint CLI

Grab the latest release from GitHub:

**[https://github.com/mzworthington/blueprint/releases/latest](https://github.com/mzworthington/blueprint/releases/latest)**

Pick the archive for your platform:

| Platform            | Asset                          |
| ------------------- | ------------------------------ |
| macOS Apple Silicon | `blueprint-macos-arm64.tar.gz` |
| macOS Intel         | `blueprint-macos-x64.tar.gz`   |
| Linux x64           | `blueprint-linux-x64.tar.gz`   |
| Windows x64         | `blueprint-windows-x64.zip`    |

## 2. Install on your `PATH`

### macOS / Linux

```bash
# Example: Apple Silicon macOS — adjust the filename for your platform
curl -fsSL -o blueprint.tar.gz \
  https://github.com/mzworthington/blueprint/releases/latest/download/blueprint-macos-arm64.tar.gz

tar -xzf blueprint.tar.gz
chmod +x blueprint

# Put it somewhere on your PATH (example)
sudo mv blueprint /usr/local/bin/blueprint
```

Or install into a user directory:

```bash
mkdir -p "$HOME/.local/bin"
mv blueprint "$HOME/.local/bin/blueprint"
# Ensure ~/.local/bin is on PATH (add to ~/.zshrc / ~/.bashrc if needed):
# export PATH="$HOME/.local/bin:$PATH"
```

Check it works:

```bash
blueprint --help
```

### Windows

1. Download `blueprint-windows-x64.zip` from the latest release.
2. Extract `blueprint.exe`.
3. Move it to a folder on your `PATH` (for example `C:\Users\<you>\bin`), or add that folder to **Environment Variables → Path**.

```powershell
blueprint.exe --help
```

## 3. Scan a codebase

From the root of the project you want to map:

```bash
cd /path/to/your/repo
blueprint
```

Interactive mode prompts for parser, glob, output directory, and TraceLens (git signals, on by default).

Headless / CI example:

```bash
blueprint --headless --glob="**/*.{ts,tsx}" --output="blueprints"
```

Useful flags: `--no-git` to skip TraceLens, `--git-since=90` for lookback, `--output` for the YAML folder. More detail: [Blueprint CLI](./cli.md).

The CLI writes diagrams under `blueprints/` (or your `--output` path): context, containers, and components.

Each file uses the [v3 YAML format](../setup.md#yaml-format-v3) — `version` is the BlueprintSpec URL, identity lives under `metaData`. For IDE autocomplete in other repos, prefer the **latest** BlueprintSpec (see [BlueprintSpec](./schema.md)):

```yaml
# yaml-language-server: $schema=https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json
```

## 4. Open Blueprint canvas

Open the hosted app:

**[https://blueprint.mzworthington.co.uk/workspace](https://blueprint.mzworthington.co.uk/workspace)**

(Or use **Open app** from this docs site.)

On first open you get a **startup chooser** on bare `/workspace`:

1. **Load sandbox** — clear local drafts/cache and explore the bundled demo diagrams (shipped in the app build).
2. **Open workspace from directory** — pick the folder that contains your generated `blueprints/` YAML.
3. Use the system switcher and C4 zoom to explore context → container → component.
4. Inspect TraceLens signals on nodes when Blueprint CLI ran with git enabled.
5. Toggle **ChaosLens** from the bottom toolbar (**Resilience** button) to simulate faults on the active diagram — see [ChaosLens](./resilience.md).
6. Optionally **Import Mermaid** (startup or toolbar **Open** menu) to merge an external diagram into the active schema — see [Blueprint canvas](./canvas.md#import-mermaid).

Deep links (`/workspace/blueprint`, etc.) skip the chooser and open the matching diagram directly.

You can also use a local build of Blueprint canvas if you are developing this repo — see [Setup & local development](../setup.md). The app is installable as a PWA for offline editing of a local workspace.

## Next

- [Blueprint canvas](./canvas.md)
- [Blueprint CLI](./cli.md)
- [TraceLens](./forensics.md)
- [ChaosLens](./resilience.md)
- [Interface tour & journeys](../journeys.md)
