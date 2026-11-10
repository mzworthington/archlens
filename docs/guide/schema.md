# BlueprintSpec

**BlueprintSpec** is ArchLens's architecture-as-code format. One YAML shape describes a context, a container, or a component view, with typed nodes and stable `entityRef` links. Canvas, the CLI, and CI read and write that file. Mermaid is a picture of it.

The narrow format is what makes the rest of ArchLens possible:

- **A pull request can show the architecture change.** The file is YAML. A display name can change without breaking a link, because identity is `entityRef`.
- **The diagram follows the file.** You don't keep a slide and a model. Mermaid and infrastructure-as-code imports merge into BlueprintSpec. An export-only view stays non-editable. See [ADR-0001](../ADRs/0001-yaml-blueprintspec-as-canonical-format.md).
- **An invalid architecture fails a check.** A public JSON Schema, editor autocomplete, and `archlens validate --contract` use the same rules.
- **The lenses share the nodes.** TraceLens, ChaosLens, and AdviceLens attach to `entityRef`. They don't invent a second map.

This page is for a team that authors the file by hand, generates it with **ArchLens CLI**, or consumes it in another tool. It covers the JSON Schema surface and how you name and link parts of an architecture with `entityRef`.

## What a BlueprintSpec file contains

Every blueprint file describes one view: who appears on the diagram, how they relate, and which layout and TraceLens signals you stored.

- The same file loads in ArchLens Canvas, passes CI checks, and round-trips through import and export.
- An external tool can validate BlueprintSpec without running ArchLens. Point it at a public schema URL.
- A versioned URL pins the contract. The `latest` URL tracks `main`.

The rules live once in `@archlens/core` and ship as JSON Schema for editors and integrators.

## Entity references

An entity reference is the stable identity of something on the map: a product landscape, a service boundary, a deployable unit, or a code module. A `name` is for people. An `entityRef` is for linking.

You use an `entityRef` to:

- **Connect diagrams in a hierarchy.** Zoom from a context map into a container map, then into components. A child diagram's identity matches the parent node you double-clicked.
- **Express a dependency across a boundary.** "Service A calls Service B" uses each party's `entityRef`, even when they live in different YAML files.
- **Align a generated view with a hand edit.** ArchLens, an IaC import, and ArchLens Canvas resolve the same identifiers, so a merge and a diff stay meaningful.
- **Anchor TraceLens and ownership.** Git and complexity signals roll up along the same tree you already use for architecture views.

An `entityRef` is a trail of slugs from the widest scope down to the finest grain you model. It isn't a file path or a repository folder, though the CLI often infers a sensible value from the repo layout.

### How you build a reference

Build a reference from short, URL-safe segments joined by `/`.

Turn a human label into a slug. Use lower case, turn spaces into hyphens, and drop punctuation. For example, `App Service` becomes `app-service`. Each extra `/` means one level deeper in the zoom model.

| Segments | Typical scope          | Example                       | What it represents                                        |
| -------- | ---------------------- | ----------------------------- | --------------------------------------------------------- |
| 1        | Context, the landscape | `blueprint`                   | The whole product portfolio or program map                |
| 2        | Container              | `blueprint/app`               | A major system or bounded capability inside the landscape |
| 3        | Component              | `blueprint/app/canvas`        | A deployable or logical part inside that system           |
| 4        | Code, optional         | `blueprint/app/canvas/canvas` | A finer module or package when you model at code level    |

A diagram file carries its scope in `metadata.entityRef`, plus a friendly `metadata.name`. Each node on the Canvas has its own `entityRef`. A dependency lists `from` and `to`.

When ArchLens scans a monorepo, it proposes references from product ids, package names, and folder structure. You can adjust a slug in YAML. Once you commit it, treat it as an integration id. Renaming a display label shouldn't require a new ref unless you reorganize the map on purpose.

### Link a parent diagram to a child

You don't need a separate parent-pointer file.

> A nested diagram's `metadata.entityRef` equals the `entityRef` of the node you drill into on the parent diagram.

For example:

- The context diagram node is `entityRef: blueprint/app`, named App System.
- The container diagram file is `metadata.entityRef: blueprint/app`, named App Containers.
- Double-clicking that node opens the child diagram because the identities match.

The same pattern applies from a container diagram to a component diagram.

### Guidance for integrators

- Prefer a stable, business-meaningful slug, such as a product, a domain, or a service, over a repo folder name that moves.
- Use a fully qualified reference, `a/b/c`, in a dependency and an external so the link works across files in a workspace.
- Pin the BlueprintSpec URL below in a consumer pipeline so validation doesn't shift when `main` moves.
- When you merge ArchLens output with a manual edit, a conflict on the same `entityRef` means two sources disagree about one real entity.

## Public schema URLs

| Channel                 | URL                                                         | Use when                                                       |
| ----------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| **Versioned, pin this** | `https://archlens.dev/schemas/v4/blueprint.schema.json`     | An external repo that shouldn't break when BlueprintSpec moves |
| **Tracking main**       | `https://archlens.dev/schemas/latest/blueprint.schema.json` | Follow BlueprintSpec on `main`                                 |

On this site, and when you run the app locally, the same paths are available on the app origin:

- `/schemas/v4/blueprint.schema.json`
- `/schemas/latest/blueprint.schema.json`

Contributors who regenerate the checked-in schema, the pre-commit check, and a major version bump should read [Setup and local development](../setup.md#blueprintspec-json-schema).

## Point an editor at the schema

Each blueprint file sets `version` to the public BlueprintSpec URL. You can also add an editor directive:

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

In this repository, workspace settings map `blueprints/**/*.yaml` to the local BlueprintSpec for autocomplete. See [Setup, YAML format v4](../setup.md#yaml-format-v4).

## Live schema

The block below fetches the BlueprintSpec on the `latest` channel and pretty-prints it. Refresh the page after a deploy to see the hosted update.

```live-schema
latest
```

## Declared system context

You can author a system context diagram, `level: context`, as well as generate one. Declare personas, software-system anchors, and third-party dependencies up front. An ArchLens scan hydrates discoveries into that seed instead of replacing what you wrote. See [ADR-0015](../ADRs/0015-declared-context-hydration.md).

There is no separate BlueprintSpec kind. Use `level: context`.

### Sparse shape

This is the minimum useful declaration for a multi-repo product:

```yaml
# yaml-language-server: $schema=https://archlens.dev/schemas/latest/blueprint.schema.json
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: acme
  name: Acme # optional - omit to derive from entityRef
nodes:
  - entityRef: acme/checkout # stable identity across repos
    type: software-system
    # name omitted → derived "Checkout"
  - entityRef: acme/buyer
    type: person
    name: Buyer # optional
    properties:
      role: product-persona
  - entityRef: acme/cloudflare # infra package / repo spoke
    type: software-system
    name: Cloudflare Hosting
    properties:
      role: infrastructure
      serves: acme/checkout # BlueprintSpec properties are scalars - comma-separate several refs
  - entityRef: acme/payment-gateway
    type: gateway-api
    name: Payment Gateway # optional curated label
    external: true
    properties:
      classification: third-party
      vendor: Stripe
dependencies:
  - from: acme/buyer
    to: acme/checkout
    type: direct-call
    description: Complete purchase
  - from: acme/checkout
    to: acme/payment-gateway
    type: direct-call
```

| Concept             | Convention                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product persona** | `type: person` plus `properties.role: product-persona`                                                                                                                     |
| **System anchor**   | `software-system` or `group`, with a stable `entityRef` and an optional `name`                                                                                             |
| **Infra spoke**     | `software-system` with `properties.role: infrastructure` and `properties.serves`, a comma-separated list of system `entityRef`s this stack supports                        |
| **Third-party**     | `external: true` plus `properties.classification: third-party`                                                                                                             |
| **Display name**    | Optional on every node. Omit it to derive a label from the `entityRef` leaf. A merge prefers an explicit name over a derived one. Two explicit names keep the earlier one. |

### From IaC to context and container

When ArchLens scans Terraform or Pulumi, it classifies each resource with a provider pack: Cloudflare, AWS, Azure, or `Google Cloud`.

| Diagram       | Projection                                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Context**   | One scan-proposed third-party per vendor that had a primary product, with an edge from each `serves` system                                                                                    |
| **Container** | Internal IaC declarations for the full classified parse. Only a primary product gets an external provisioned node, linked with `provisions`. Supporting and noise nodes stay declaration-only. |

See [ADR-0016](../ADRs/0016-iac-declaration-vs-provisioned-infrastructure.md). An author-declared third-party keeps its name and its ownership. A scan proposal hydrates through the same plan as a code discovery. See [ADR-0015](../ADRs/0015-declared-context-hydration.md). The full workflow is [Meaningful external dependencies](./cli.md#meaningful-external-dependencies).

Seed files live under the scan output directory, at `blueprints/context.yaml` or `blueprints/<ctx>/context.yaml`. The context folder is optional. Commit them in the repo the same way this project does at [`blueprints/archlens/context.yaml`](../../blueprints/archlens/context.yaml). Read [Declare then scan](./cli.md#declare-then-scan) for how a scan merges into the seed.

## Catalog staging and BlueprintSpec

Estate fragments and compose don't change BlueprintSpec. See [ADR-0014](../ADRs/0014-estate-fragments-and-compose-before-publish.md). Diagram YAML in a local folder, in a fragment, and in a published snapshot is still the BlueprintSpec and `SystemSchema` contract on this page.

These artifacts aren't BlueprintSpec:

| Artifact                 | Role                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Fragment `manifest.json` | Metadata for a staged product or slice: `estateId`, `productId`, `sourceRef`, and the rest |
| Suggestion overlay YAML  | Accepted or rejected intent, `delta.nodes` and `delta.dependencies`, under `overlays/`     |

Compose merges fragments, plus accepted overlays, into a normal ADR-0010 catalog of BlueprintSpec files. A local folder edit and a Canvas working copy still use BlueprintSpec only. See [ADR-0001](../ADRs/0001-yaml-blueprintspec-as-canonical-format.md) and [ADR-0004](../ADRs/0004-local-first-fs-access-and-indexeddb-working-copy.md).

## Next

- [ChaosSpec](./chaos-spec.md) is a failure scenario that references a BlueprintSpec diagram.
- [ArchLens CLI](./cli.md) generates diagrams that follow BlueprintSpec, including [declare then scan](./cli.md#declare-then-scan).
- [ArchLens Canvas](./canvas.md) is where you edit and validate a workspace.
- [Getting started](./getting-started.md)
- [GitHub Actions workflows](./ci-workflows.md) covers declared seeds and the fragment-to-compose catalog jobs.
