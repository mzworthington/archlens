# ArchLens documentation

Product docs are Markdown in this folder. ArchLens Canvas app renders them at:

| Path                                      | Content                                     |
| ----------------------------------------- | ------------------------------------------- |
| `/`                                       | Product homepage                            |
| `/guide` …                                | [Product guide](./guide/index.md)           |
| `/guide/jobs`                             | Jobs for today                              |
| `/guide/collaborate`                      | Share, rooms and comments                   |
| `/guide/tracelens`                        | TraceLens                                   |
| `/guide/chaoslens`                        | ChaosLens                                   |
| `/guide/advicelens`                       | AdviceLens                                  |
| `/guide/schema`                           | BlueprintSpec                               |
| `/guide/chaos-spec`                       | ChaosSpec                                   |
| `/guide/ci-workflows`                     | GitHub Actions workflows                    |
| `/guide/vscode`                           | Editor sandbox and manual pre-release       |
| `/workspace?lens=tracelens`               | TraceLens rankings (live app)               |
| `/workspace?lens=advicelens`              | AdviceLens recommendations (live app)       |
| `/workspace`                              | ArchLens Canvas (live app)                  |
| `/design-system`                          | Design system showcase                      |
| `/setup`, `/tech-stack`, `/architecture`  | Tech (setup, stack, architecture)           |
| `/chaoslens-engine`, `/advicelens-engine` | Tech (engine contributor docs)              |
| `/journeys`                               | Interface tour & journeys                   |
| [ADRs](./ADRs/README.md)                  | Architecture Decision Records (sparse MADR) |
| `/features-unit`                          | Generated unit test feature report          |

Open ArchLens Canvas at **[archlens.dev/workspace](https://archlens.dev/workspace)** (or `/workspace` on the same origin).

Start with the [Product guide](./guide/index.md) for Canvas, live share, the CLI, TraceLens, ChaosLens and AdviceLens. The learning path is the [getting started tutorial](./tutorials/getting-started.md). Use [Setup & local development](./setup.md) when hacking on this repository.

## Diátaxis map

Published URLs under `/guide` stay in place. New pages use the quadrant paths. Decision records, PRDs, plans, quality notes, and `docs/archive/` stay outside the four folders.

| Quadrant    | Published now                                                                                                    | Still in the old path                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Tutorial    | [Getting started](./tutorials/getting-started.md) (`/tutorials/getting-started`, alias `/guide/getting-started`) | [Jobs](./guide/jobs.md) and [journeys](./journeys.md) remain task and tour pages                                                            |
| How-to      | [GitHub Actions diagrams](./how-to/github-actions-c4.md), [monorepo boundaries](./how-to/monorepo-boundaries.md) | Canvas, collaborate, lenses, CLI narrative, editor, and [setup](./setup.md)                                                                 |
| Reference   | [CLI](./reference/cli.md), [config schema](./reference/config-schema.md)                                         | [BlueprintSpec](./guide/schema.md), [ChaosSpec](./guide/chaos-spec.md), [workflows](./guide/ci-workflows.md), [tech stack](./tech-stack.md) |
| Explanation | [Architecture concepts](./explanation/architecture-concepts.md)                                                  | [Architecture and security](./architecture.md), engine pages, [ADRs](./ADRs/README.md)                                                      |

Contributors: run `cd app && pnpm dev` to serve docs (`/`) and canvas (`/workspace`) locally.
