# Setup & Local Development

Contributor reference: local toolchain, package install, dev server, builds, and quality commands.

For **using** ArchLens (install CLI, scan a repo, open canvas), see the [Product guide](./guide/) - especially [Getting started](./guide/getting-started.md).

---

## Environment & Tooling Setup

We use **[Mise](https://mise.jdx.dev/)** to manage Node.js, pnpm, Bun, Go, and docs-media tooling (`ffmpeg`, `vhs`) defined in `mise.toml`. **Bun is required** for `@archlens/cli` builds and the husky pre-push gate. **ttyd** (for `pnpm test:vhs`) is installed via apt in CI; on macOS use `brew install ttyd`.

1. **Install Mise:** Refer to the [Mise Installation Guide](https://mise.jdx.dev/getting-started.html) (e.g., `brew install mise`).
2. **Activate Mise:** e.g. add `eval "$(mise activate zsh)"` to your `~/.zshrc`.
3. **Install Tools:** from the repository root:
   ```bash
   mise install                 # full toolchain including ffmpeg/vhs
   # or core only (matches Cursor Cloud agents):
   mise run install-tools       # node, pnpm, bun, go
   ```

One-shot bootstrap (also used by Cursor Cloud via `.cursor/environment.json`):

```bash
bin/setup-dev-env.sh
```

That script also ensures [agent-lifecycle-kit](https://github.com/mzworthington/agent-lifecycle-kit) is available (prefers `~/.agents`, then a sibling/`/agent/repos` checkout, otherwise clones and runs `install.sh`). Skip with `SKIP_LIFECYCLE_KIT=1`.

The production toolchain is TypeScript under `app/` plus Go for **ChaosLens** (`resilience-engine/`).

Common Mise tasks (from the repo root):

```bash
mise run install-tools # node, pnpm, bun, go (skip docs-media)
mise run install       # pnpm install in app/
mise run dev           # designer dev server
mise run build-wasm    # compile ChaosLens WASM for the canvas (see ChaosLens engine doc)
mise run test-go       # Go unit tests
mise run build         # full production build
```

---

## Getting Started

### 1. Install Dependencies & Setup Husky Hooks

```bash
cd app
pnpm install
```

If Git hooks are not configured automatically:

```bash
pnpm run prepare
```

### 2. Run locally

One command serves docs (`/`) and the canvas (`/workspace`):

```bash
pnpm dev
```

Opens the Vite designer. Docs and workspace share the same React app.

### 3. Build Production Artifacts

```bash
pnpm build
```

GitHub Pages deploys the designer `dist/` (docs + app in one SPA). The production build registers a service worker (PWA) so the designer shell can load offline after the first visit.

Each production build gets a unique **build id** (from `GITHUB_SHA` in CI, injected into `index.html` and the JS bundle). When a new deploy is live, users see an **update banner** at the top of the app - **Refresh** activates the new service worker; **Later** dismisses until the next check (tab focus also re-checks `index.html` with `cache: no-store`).

### Bundled demo blueprints

The designer build **embeds** a subset of `blueprints/` at compile time (`context.yaml` eagerly, other YAML via Vite glob imports). You do not need to run the CLI before `pnpm build`, but committed files under `blueprints/` must exist (at minimum `blueprints/context.yaml`) or the build fails.

After changing blueprint YAML locally:

1. Re-run the CLI scan if you want fresh architecture output.
2. Rebuild the designer (`pnpm build`) so the bundled demo matches.
3. In the running app, use **Load sandbox** on `/workspace` to clear IndexedDB/session caches and reload the embedded demo.

For day-to-day development of this repo, scan from the repository root:

```bash
# from blueprint/ (repo root)
cd app
pnpm --filter /cli exec tsx src/cli/archlens.ts \
  --headless --glob="../app/packages/**/*.{ts,tsx}" \
  --output="../blueprints" --context="blueprint" --no-git
```

---

## Testing, Formatting & Quality Control

```bash
pnpm test
pnpm test:coverage
pnpm test:ci
pnpm test:e2e
pnpm format:check
pnpm format:write
pnpm lint
pnpm knip
```

Designer E2E (`app/packages/designer`: `pnpm test:e2e`) includes ChaosLens smoke coverage. Refresh product-guide GIFs with `pnpm record:docs-media` (`ffmpeg` from `mise install`; writes `docs/screenshots/chaoslens.gif`, `tracelens.gif`, `canvas-tour.gif`). CLI demo GIF: `pnpm test:vhs` (`vhs` + `ffmpeg` from mise; `ttyd` via `brew install ttyd` on macOS). `pnpm generate:features-unit` regenerates [Unit test features](./features-unit.md) locally. CI runs the same steps via [Sync Derived Outputs](../.github/workflows/sync-derived.yml).

On every push to `main`, production builds regenerate schema and features-unit inline so deploys stay fresh. You can also redeploy without a new commit via **Actions → CI & Deployment Pipeline → Run workflow** (branch: `main`). Committed copies of `CHANGELOG.md`, `docs/features-unit.md`, `schemas/`, and product-guide screenshots are refreshed by the **Sync Derived Outputs** workflow (weekly on Sunday 06:00 UTC, or manually via **Actions → Sync Derived Outputs → Run workflow**).

---

## Git Commit Hooks

Husky + lint-staged validate commits for changes under `app/`, `docs/`, and `resilience-engine/`:

### Pre-commit (staged files)

- Prettier auto-formats staged files (`--write` via lint-staged); the hook then runs full-repo `format:check` (matching CI)
- Oxlint on TypeScript (`--deny-warnings`)
- TypeScript typecheck (`tsc -b`, matching the build step) — includes `src/**/*.test.ts` in designer
- Knip and `vitest run --changed` on staged `app/` paths
- When `app/packages/core/` is staged, checks that `schemas/blueprint.schema.json` (and `v*` / `latest` copies) match the Zod contract - commit fails if stale; run `pnpm generate:schema` to refresh
- When `resilience-engine/**/*.go` is staged, runs `gofmt`, `go vet`, and `go test`
- ChaosLens WASM (`chaoslens.wasm`) is **not** checked into git - CI and `pnpm build` compile it via `make copy-wasm`; local `pnpm dev` runs `make ensure-wasm` on first start when artifacts are missing

### Pre-push (commits being pushed)

When commits in `@{upstream}..HEAD` touch `app/`, runs `pnpm typecheck` and `pnpm build` (`scripts/hooks/pre-push-app-build.sh`). This is a safety net if pre-commit was skipped (`git commit --no-verify`) or if you amended/rebased after commit.

Install the recommended **YAML** extension (`redhat.vscode-yaml`). Workspace settings map `blueprints/**/*.yaml` to the local schema for autocomplete and validation.

### YAML format (v4)

Each blueprint file is a single YAML **mapping** (not a sequence). `version` is the public JSON Schema URL for this contract; diagram identity lives under `metadata`:

```yaml
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: component
metadata:
  entityRef: blueprint/app/cli
  name: Cli Service Components
nodes: []
dependencies: []
```

Node and dependency shapes are unchanged from v2. Parsers still accept legacy v2 files (one-element sequence with flat `entityRef` / `name` / `version`); writers always emit v4.

### BlueprintSpec JSON Schema

BlueprintSpec rules live in `app/packages/core/` as Zod contracts. The checked-in JSON Schema files (`schemas/blueprint.schema.json` and versioned copies) are generated from that source:

```bash
cd app && pnpm generate:schema
```

Pre-commit and CI run `generate:schema -- --check` when `app/packages/core/` changes and fail if the files are stale. Bump `SYSTEM_SCHEMA_MAJOR_VERSION` in core only when the wire format breaks; `latest` always tracks `main`.

Product walkthrough (with a live render of latest): [BlueprintSpec](./guide/schema.md).

### Public schema URLs (external repos)

After deploy, the same schema is served from the designer site:

- **Versioned (preferred):** https://archlens.dev/schemas/v4/blueprint.schema.json
- **Latest:** https://archlens.dev/schemas/latest/blueprint.schema.json

In any blueprint YAML file outside this repo, either set `version` to one of those URLs (as above) or add an IDE directive:

```yaml
# yaml-language-server: $schema=https://archlens.dev/schemas/latest/blueprint.schema.json
```

Bump `SYSTEM_SCHEMA_MAJOR_VERSION` in `/core` only when the contract breaks; `latest` always tracks main.

ChaosLens WASM build, Go layout, and TypeScript API: [ChaosLens engine](./chaoslens-engine.md).
