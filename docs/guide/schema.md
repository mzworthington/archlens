# BlueprintSpec

**BlueprintSpec** is the declarative architecture format - the shared contract every product reads and writes. This page is for teams integrating with BlueprintSpec YAML: whether you author diagrams by hand, generate them from **ArchLens**, or consume them in another tool. It explains the **JSON Schema** validation surface and how we name and link parts of an architecture using **`entityRef`**.

---

## What BlueprintSpec guarantees

Every blueprint file describes one view of your systems architecture: who appears on the diagram, how they relate, and (optionally) layout and TraceLens signals. BlueprintSpec ensures that:

- The same file loads in ArchLens Canvas, passes CI checks, and round-trips through import/export.
- External tools can validate YAML without running ArchLens - by pointing at a public BlueprintSpec URL.
- Breaking changes are rare and versioned; non-breaking additions ship on the `latest` channel.

Under the hood, rules are defined once in `@archlens/core` and published as JSON Schema for editors and integrators.

---

## Entity references (`entityRef`)

### Purpose

An **entity reference** is the stable identity of something on your architecture map - a product landscape, a service boundary, a deployable unit, or a code module. Display names (`name` fields) are for people; **`entityRef` is for linking**.

We use it to:

- **Connect diagrams in a hierarchy** - zoom from a context map into a container map, then into components. A child diagram’s identity matches the parent node you double-clicked.
- **Express dependencies across boundaries** - “Service A calls Service B” uses each party’s `entityRef`, even when they live in different YAML files.
- **Align generated and hand-edited views** - ArchLens, IaC import, and ArchLens Canvas all resolve to the same identifiers so merges and diffs stay meaningful.
- **Anchor TraceLens and ownership** - git and complexity signals roll up along the same tree the business already uses for C4 views.

Think of `entityRef` as a **breadcrumb trail** from the widest scope down to the finest grain you model, not as a file path or repository folder (though the CLI often infers sensible values from repo layout).

### How we craft them

References are built from **short, URL-safe segments** joined by `/`:

- Human labels are **slugified**: lower case, spaces → hyphens, punctuation removed (e.g. `App Service` → `app-service`).
- Each extra `/` means **one level deeper** in the C4 zoom model.

| Segments | Typical scope       | Example                       | What it represents                                        |
| -------- | ------------------- | ----------------------------- | --------------------------------------------------------- |
| 1        | Context (landscape) | `blueprint`                   | Whole product portfolio or programme map                  |
| 2        | Container           | `blueprint/app`               | A major system or bounded capability inside the landscape |
| 3        | Component           | `blueprint/app/canvas`        | A deployable or logical part inside that system           |
| 4        | Code (optional)     | `blueprint/app/canvas/canvas` | Finer module or package when you model at code level      |

**Diagram files** carry their scope in `metadata.entityRef` (and a friendly `metadata.name`). **Nodes** on the canvas each have their own `entityRef`. **Dependencies** list `from` and `to` entity references.

When ArchLens scans a monorepo, it proposes references from product IDs, package names, and folder structure. You can adjust slugs in YAML; once committed, treat them as **integration IDs** - renaming a display label should not require renaming refs unless you intentionally reorganise the map.

### Linking parent and child diagrams

No separate “parent pointer” file is required. The rule is simple:

> A nested diagram’s `metadata.entityRef` **equals** the `entityRef` of the node you drill into on the parent diagram.

Example:

- Context diagram node: `entityRef: blueprint/app`, name “App System”.
- Container diagram file: `metadata.entityRef: blueprint/app`, name “App Containers”.
- Double-clicking that node opens the child diagram because the identities match.

The same pattern applies from container → component diagrams.

### Practical guidance for integrators

- Prefer **stable, business-meaningful slugs** (product, domain, service) over transient repo folder names when authoring by hand.
- Use **fully qualified** references (`a/b/c`) in dependencies and externals so links work across files in a workspace.
- Pin the **BlueprintSpec URL** (below) in consumer pipelines so validation behaviour does not shift unexpectedly.
- When merging ArchLens output with manual edits, conflicts on the same `entityRef` are the signal that two sources disagree about one real-world entity.

---

## Public BlueprintSpec URLs

| Channel                            | URL                                                         | Use when                                                    |
| ---------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| **Versioned (preferred for pins)** | `https://archlens.dev/schemas/v4/blueprint.schema.json`     | External repos that should not break on BlueprintSpec bumps |
| **Latest**                         | `https://archlens.dev/schemas/latest/blueprint.schema.json` | Tracking BlueprintSpec on `main`                            |

Locally (and on this docs site), the same paths are available under the app origin:

- `/schemas/v4/blueprint.schema.json`
- `/schemas/latest/blueprint.schema.json`

Contributors: regenerating checked-in schema files, pre-commit checks, and major version bumps - [Setup & local development](../setup.md#blueprintspec-json-schema).

---

## Pointing an editor at BlueprintSpec

Each blueprint file sets `version` to the public BlueprintSpec URL. You can also add an IDE directive:

```yaml
# yaml-language-server: $schema=https://archlens.dev/schemas/latest/blueprint.schema.json
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: component
metadata:
  entityRef: blueprint/app/api
  name: Api Components
nodes:
  - entityRef: blueprint/app/api/gateway
    type: rest-api
    name: API Gateway
dependencies:
  - from: blueprint/app/api/gateway
    to: blueprint/app/orders
    type: direct-call
```

Contributors working in this repository: workspace settings map `blueprints/**/*.yaml` to the local BlueprintSpec for autocomplete - see [Setup - YAML format (v4)](../setup.md#yaml-format-v4).

## Live BlueprintSpec (latest)

The block below fetches the **latest** BlueprintSpec served with this app and pretty-prints it. Refresh the page after a new deploy to see updates on the hosted site.

```live-schema
latest
```

## Catalog staging vs BlueprintSpec

**BlueprintSpec is unchanged** by estate fragments and compose ([ADR-0014](../ADRs/0014-estate-fragments-and-compose-before-publish.md)). Diagram YAML in local folders, fragments, and published snapshots is still the same BlueprintSpec / `SystemSchema` contract on this page.

What is **not** BlueprintSpec:

| Artifact                 | Role                                                                              |
| ------------------------ | --------------------------------------------------------------------------------- |
| Fragment `manifest.json` | Metadata for a staged product/slice (`estateId`, `productId`, `sourceRef`, …)     |
| Suggestion overlay YAML  | Accepted/rejected intent (`delta.nodes` / `delta.dependencies`) under `overlays/` |

Compose merges fragments (+ accepted overlays) into a normal ADR-0010 catalog of BlueprintSpec files. Local folder edits and Canvas working copies still use BlueprintSpec only ([ADR-0001](../ADRs/0001-yaml-blueprintspec-as-canonical-format.md), [ADR-0004](../ADRs/0004-local-first-fs-access-and-indexeddb-working-copy.md)).

## Next

- [ChaosSpec](./chaos-spec.md) - failure scenarios that reference BlueprintSpec diagrams
- [ArchLens](./cli.md) - generating diagrams that follow BlueprintSpec
- [ArchLens Canvas](./canvas.md) - editing and validating in the workspace
- [Getting started](./getting-started.md)
- [GitHub Actions workflows](./ci-workflows.md) - fragment → compose catalog jobs
