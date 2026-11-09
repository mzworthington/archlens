# Configure monorepo boundaries

Tell ArchLens which directories are software systems so a monorepo scan doesn't invent a system per package.

Prerequisite: the ArchLens CLI on `PATH`. See [Getting started](/tutorials/getting-started).

## Steps

1. Add `blueprint.config.json` at the repository root, next to the directory you scan:

```json
{
  "context": "acme",
  "systems": ["packages/checkout", "packages/catalog"],
  "rollupModules": true,
  "ignore": ["**/generated/**"]
}
```

`systems` lists repository-relative roots. `rollupModules` collapses package names that contain `-module-` to the prefix before that marker. The default is `false`.

2. Scan those roots:

```bash
archlens scan --systems=packages/checkout,packages/catalog --output=blueprints
```

A value in `--systems` overrides `systems` in the config file for that run. `--rollup-modules` overrides `rollupModules`.

3. Open `blueprints/` in ArchLens Canvas, or read the context YAML.

## Expected output

The context diagram lists the systems you named. A system node `entityRef` looks like `acme/checkout`. Packages under `packages/checkout` land in that system instead of becoming their own top-level systems.

With `rollupModules` true, a package named `checkout-module-payments` rolls up under the `checkout` prefix.

## Check

```bash
archlens validate blueprints/
```

Exit `0` means the tree has no actionable module cycle. Confirm the context file lists only the roots from `systems`. Key types are in the [config schema](/reference/config-schema).
