# ArchLens documentation

Product docs are Markdown in this folder. The designer app renders them at:

| Path                                   | Content                            |
| -------------------------------------- | ---------------------------------- |
| `/`                                    | Product homepage                   |
| `/guide` …                             | [Product guide](./guide/index.md)  |
| `/guide/tracelens`                     | TraceLens                          |
| `/guide/chaoslens`                     | ChaosLens                          |
| `/guide/schema`                        | BlueprintSpec                      |
| `/tracelens`                           | TraceLens rankings (live app)      |
| `/workspace`                           | ArchLens Canvas (live app)         |
| `/setup`, `/architecture`, `/journeys` | Contributor reference              |
| `/chaoslens-engine`                    | ChaosLens engine (contributors)    |
| `/features-unit`                       | Generated unit test feature report |

Open ArchLens Canvas at **[archlens.dev/workspace](https://archlens.dev/workspace)** (or `/workspace` on the same origin).

Start with the [Product guide](./guide/index.md) for using Blueprint CLI, ArchLens Canvas, TraceLens, and ChaosLens. Use [Setup & local development](./setup.md) when hacking on this repository.

Contributors: run `cd app && pnpm dev` to serve docs (`/`) and canvas (`/workspace`) locally.
