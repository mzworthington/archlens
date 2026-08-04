# ArchLens documentation

Product docs are Markdown in this folder. The designer app renders them at:

| Path                                      | Content                                                    |
| ----------------------------------------- | ---------------------------------------------------------- |
| `/`                                       | Product homepage                                           |
| `/guide` …                                | [Product guide](./guide/index.md)                          |
| `/guide/tracelens`                        | TraceLens                                                  |
| `/guide/chaoslens`                        | ChaosLens                                                  |
| `/guide/advicelens`                       | AdviceLens                                                 |
| `/guide/schema`                           | BlueprintSpec                                              |
| `/guide/ci-workflows`                     | GitHub Actions workflows                                   |
| `/tracelens`                              | TraceLens rankings (live app)                              |
| `/advicelens`                             | AdviceLens recommendations (live app; opens TraceLens tab) |
| `/workspace`                              | ArchLens Canvas (live app)                                 |
| `/design-system`                          | Design system showcase                                     |
| `/setup`, `/tech-stack`, `/architecture`  | Tech (setup, stack, architecture)                          |
| `/chaoslens-engine`, `/advicelens-engine` | Tech (engine contributor docs)                             |
| `/journeys`                               | Interface tour & journeys                                  |
| [ADRs](./ADRs/README.md)                  | Architecture Decision Records (sparse MADR)                |
| `/features-unit`                          | Generated unit test feature report                         |

Open ArchLens Canvas at **[archlens.dev/workspace](https://archlens.dev/workspace)** (or `/workspace` on the same origin).

Start with the [Product guide](./guide/index.md) for using ArchLens, ArchLens Canvas, TraceLens, ChaosLens, and AdviceLens. Use [Setup & local development](./setup.md) when hacking on this repository.

Contributors: run `cd app && pnpm dev` to serve docs (`/`) and canvas (`/workspace`) locally.
