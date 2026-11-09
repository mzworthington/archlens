# Getting started

Scan a repository into BlueprintSpec and open the first diagram in ArchLens Canvas.

Prerequisite: a repository on disk. The install command below is for macOS and Linux. Windows install steps are in the [CLI reference](/reference/cli#install).

## 1. Open the demo

Open [ArchLens Canvas](https://archlens.dev/workspace).

Bare `/workspace` shows the startup chooser. Choose **Try the demo**. ChaosLens opens on the bundled map so you can simulate a failure before you install anything.

## 2. Install the CLI

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | bash
```

The script installs `archlens` to `~/.local/bin` and copies the tree-sitter parsers next to the binary. Add `~/.local/bin` to `PATH` if the shell doesn't find the command.

```bash
archlens --version
```

The command prints the installed version.

## 3. Scan the repository

From the repository root:

```bash
cd /path/to/your/repository
archlens scan
```

`archlens scan` writes BlueprintSpec YAML under `blueprints/`. TraceLens git signals are on when the folder contains `.git`. Flag names, types, and defaults are in the [CLI reference](/reference/cli).

## 4. Open the diagrams

Return to [ArchLens Canvas](https://archlens.dev/workspace). Choose **Investigate**, then **Open existing blueprints folder**, and select `blueprints/`.

Use the system switcher and C4 zoom to move from Context to Container to Component.

## Check the result

- `archlens --version` prints a version.
- `blueprints/` contains YAML files.
- Canvas shows a context diagram for the repository.

## Next

- [CLI reference](/reference/cli)
- [Config schema](/reference/config-schema)
- [ArchLens Canvas](/guide/canvas)
- [Jobs for today](/guide/jobs)
