# Contributing to ArchLens

Thanks for your interest in contributing. ArchLens is a local-first systems architecture platform - ArchLens Canvas (designer), ArchLens scanner, and shared `@archlens/core` domain layer.

## Before you start

- Check [existing issues](https://github.com/mzworthington/archlens/issues) to avoid duplicate work.
- For bugs, use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml).
- For new capabilities, use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml).
- For security issues, see [SECURITY.md](SECURITY.md) - please report privately.

## Local setup

See [Setup & Local Development](docs/setup.md) for tooling (Mise, Node, pnpm, Bun), install steps, and quality commands.

Quick start:

```bash
# Full toolchain (or: bin/setup-dev-env.sh for mise + core tools + deps + WASM)
mise install
cd app
pnpm install
pnpm dev
```

Cursor Cloud agents use `.cursor/environment.json` → `bin/setup-dev-env.sh`, which installs **bun** via mise (needed for CLI build / pre-push) and bootstraps `agent-lifecycle-kit` into `~/.agents` when missing.

## Making changes

1. Fork the repository and create a branch from `main`.
2. Make focused changes - one logical change per pull request when possible.
3. Keep domain logic in `@archlens/core`, UI and adapters in `@archlens/designer`, CLI code in `@archlens/cli`.
4. For parsers, merge plans, and other pure domain logic in core, prefer **tests first** (red → green → refactor).
5. If you change Zod schemas in `app/packages/core/`, regenerate JSON Schema artifacts:

   ```bash
   cd app && pnpm generate:schema
   ```

## Quality checks

Before opening a pull request, run the checks that match CI:

```bash
cd app
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

Pre-commit hooks (Husky + lint-staged) run formatting, lint, typecheck, and related checks when you commit changes under `app/` or `docs/`. Go changes under `resilience-engine/` run `gofmt`, `go vet`, and tests (see [setup](docs/setup.md#git-commit-hooks)).

CI also runs E2E tests, coverage, and a production build. Run `pnpm test:e2e` locally if your change affects the Designer UI.

## Pull requests

Open a PR against `main` and fill out the [pull request template](.github/pull_request_template.md):

- **Summary** - what changed and why
- **Test plan** - how you verified the change
- **Related issues** - link with `Fixes #123` when applicable

We may ask for revisions or additional tests before merging. Small, well-tested PRs are easier to review.

## Project conventions

- **Canonical format:** YAML `SystemSchema` files (BlueprintSpec) linked by `entityRef` - not Mermaid. Mermaid is a derived export.
- **Imports:** External diagrams enter via import wizards that parse into `SystemSchema`, preview merge conflicts, and apply only user-approved changes.
- **Workspace edits:** Prefer merge-into-active-diagram with conflict preview over wholesale file replacement.

More detail: [Architecture & security](docs/architecture.md).

## Questions

If something is unclear, open a [feature request](.github/ISSUE_TEMPLATE/feature_request.yml) or ask in an existing issue. We are happy to help you find a good first contribution.
