# What do I do today?

Pick the job in front of you. Each card opens the steps and a command or path you can use now.

Each heading is `id | title`. The homepage picker and the [Jobs for today](./guide/jobs.md) page share this file.

## first-look | I have never used ArchLens

> Open the sandbox. Fault a service. Read the ranked list. No install.

The hosted canvas loads a demo map. ChaosLens and AdviceLens run on that map. Drafts stay in the browser. Live share rooms talk to a Worker we host for that session. Catalog publish from CI is a separate, explicit step. Nothing else is uploaded to ArchLens servers.

1. **Open** Canvas on this site.
2. **Choose** Try the demo on the startup chooser.
3. **Fault** a service, then open AdviceLens for the ranked list.

```
/workspace
```

- [5-minute walkthrough](/journeys)
- [Getting started](./guide/getting-started.md)
- [ChaosLens guide](./guide/chaoslens.md)

## share-live | Join a room with your peers

> Start a room. Send the link. Peers join and edit the same map.

A live room is a shared BlueprintSpec working copy. Optional room secret (not in the URL). Rooms are ephemeral: not a catalog and not a write to disk.

1. **Open** Canvas and pick **Collaborate** (blank room, folder or file).
2. **Copy** the link after you set your name and who can join.
3. **Send** it to your peers so they can join. Commit YAML later via Pending Changes if this is a folder workspace.

```
/workspace
```

- [Collaborate guide](./guide/collaborate.md)
- [ArchLens Canvas](./guide/canvas.md)
- [Privacy](./privacy.md)

## mermaid | I already have a Mermaid diagram

> Blank canvas or import Mermaid. Scan later if you want git or ChaosLens.

Import is a merge into BlueprintSpec with a conflict preview. Forensics and Mermaid styling do not survive. Do not edit the Code Viewer Mermaid tab expecting a round trip.

1. **Open** Canvas and pick **Ideate**.
2. **Choose** Import from Mermaid (or Start a blank canvas, then Open → Import Mermaid).
3. **Review** the preview and merge. Share later from the toolbar if peers need the same map.

```
/workspace
```

- [ArchLens Canvas](./guide/canvas.md)
- [Getting started](./guide/getting-started.md)
- [BlueprintSpec](./guide/schema.md)

## browser-scan | Map a folder without installing

> Investigate, then Browser lite scan. Structure only. No git hotspots.

The browser File System Access API builds BlueprintSpec in memory. Application languages plus Terraform/Pulumi. No TraceLens, no CI publish, no writes unless you save later.

1. **Open** Canvas and pick **Investigate**.
2. **Choose** Browser lite scan and select a source folder.
3. **Explore** the generated map. Install the CLI when you need git forensics or publish.

```
/workspace
```

- [Getting started](./guide/getting-started.md)
- [Browser scan vs CLI](./ADRs/0017-browser-structural-scan-vs-cli-forensics.md)
- [ArchLens Canvas](./guide/canvas.md)

## cli-scan | Scan a repo with git hotspots

> TraceLens needs the CLI. Install, then run `archlens` in the repo.

Interactive `archlens` prompts for parser, glob, output directory and TraceLens (on by default). It writes BlueprintSpec under `blueprints/` (or `--output`). Open that folder in Canvas.

1. **Install** `archlens` onto PATH (macOS / Linux snippet below).
2. **Run** it from the repo you want to map.
3. **Open** the output folder in Canvas (**Investigate** → Open existing blueprints folder).

```
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | bash
```

- [Getting started](./guide/getting-started.md)
- [ArchLens CLI](./guide/cli.md)
- [TraceLens guide](./guide/tracelens.md)

## catalog | Open the estate the pipeline published

> Catalog is read-only. CI wrote it. Canvas just shows it.

A composed `latest` snapshot is the estate view. Live rooms and folder commits are not the catalog. On this site, **Try the demo** loads the samples estate.

1. **Have** a composed catalog from CI, or use the hosted samples estate.
2. **Open** Canvas and pick **Try the demo**.
3. **Browse** systems on the map. Drafts stay in the browser. Commit does not write the catalog.

```
/workspace
```

- [ArchLens Canvas](./guide/canvas.md)
- [ArchLens CLI](./guide/cli.md)
- [GitHub Actions workflows](./guide/ci-workflows.md)

## chaos | What fails if this service dies

> Fault a node on the open map. Production stays up.

ChaosLens is Monte Carlo on the diagram you already have open. Blast radius and SLA bands stay in the browser.

1. **Open** a map (demo, folder or scan).
2. **Toggle** ChaosLens from the bottom toolbar (Resilience).
3. **Fault** a service and read what else fails.

```
/workspace/application?lens=chaoslens
```

- [ChaosLens guide](./guide/chaoslens.md)
- [ChaosSpec](./guide/chaos-spec.md)
- [5-minute walkthrough](/journeys)

## rank | What should we change first

> One ranked list from TraceLens and ChaosLens. Same items in Canvas, the CLI and CI.

AdviceLens does not invent a third dashboard. Priority comes from the git hotspots and the failure simulation you already ran.

1. **Have** a map with TraceLens and/or ChaosLens signals.
2. **Open** AdviceLens from the workspace (or the CLI estate sweep).
3. **Pick** the top row and follow the evidence.

```
/workspace?lens=advicelens
```

- [AdviceLens guide](./guide/advicelens.md)
- [TraceLens guide](./guide/tracelens.md)
- [CLI estate sweep](./guide/cli.md)

## ci-gate | Fail the PR when architecture regresses

> Validate, diff or run an AdviceLens SLA gate in CI. BlueprintSpec is the contract.

Headless flags skip prompts. Validation does not block catalog publish unless you pass `--validate`.

1. **Scan** in CI to a `blueprints/` folder.
2. **Gate** with `archlens validate`, `archlens diff` or `archlens resilience`.
3. **Publish** a catalog fragment when the estate view should update.

```
archlens validate blueprints/
```

- [GitHub Actions workflows](./guide/ci-workflows.md)
- [ArchLens CLI](./guide/cli.md)
- [AdviceLens guide](./guide/advicelens.md)
