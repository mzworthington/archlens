# CLI reference

`archlens` scans source into BlueprintSpec, checks architecture health, and publishes catalog snapshots. Run `archlens help [topic]` for the same text in the terminal. Topics: `scan`, `enrich`, `validate`, `diff`, `publish`, `catalog`, `resilience`, `update`.

Values below match the CLI help catalog. Config file keys are in the [config schema](/reference/config-schema).

## Install

macOS and Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | bash
```

Pin a version or directory:

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | bash -s -- --version v0.1.5
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | bash -s -- --dir "$HOME/bin"
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.ps1 | iex
```

Release archives: [GitHub releases](https://github.com/mzworthington/archlens/releases/latest).

| Platform            | Asset                         |
| ------------------- | ----------------------------- |
| macOS Apple Silicon | `archlens-macos-arm64.tar.gz` |
| macOS Intel         | `archlens-macos-x64.tar.gz`   |
| Linux x64           | `archlens-linux-x64.tar.gz`   |
| Windows x64         | `archlens-windows-x64.zip`    |

Keep `archlens` and the `tree-sitter*.wasm` files in the same directory on `PATH`.

## Global flags

| Flag                      | Type    | Default                          | Description                                                                          |
| ------------------------- | ------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| `--help`, `-h`            | boolean | off                              | Show help                                                                            |
| `--version`, `-V`         | boolean | off                              | Print version and exit                                                               |
| `--headless`              | boolean | off                              | Skip interactive prompts                                                             |
| `--no-update-check`       | boolean | off                              | Skip the startup update prompt                                                       |
| `--output=<dir>`          | string  | `blueprints`                     | Blueprint output folder. Overridden by `ARCHLENS_OUTPUT_DIR` when the flag is absent |
| `--glob=<pattern>`        | string  | `**/*.{ts,tsx,cs,java,go,py,tf}` | Source files to scan                                                                 |
| `--context=<name>`        | string  | `blueprint`                      | Root `entityRef` slug                                                                |
| `--system-name=<name>`    | string  | unset                            | Software system name for this repository on a multi-repository product               |
| `--no-git`                | boolean | off                              | Skip TraceLens git forensics                                                         |
| `--git`                   | boolean | on for scan                      | Attach git forensics                                                                 |
| `--git-since=<days>`      | number  | `365`                            | forensics lookback in days                                                           |
| `--watch`                 | boolean | off                              | Re-run when source files change                                                      |
| `--watch-debounce=<ms>`   | number  | `500`                            | Debounce before a watch re-run                                                       |
| `--enrich-only`           | boolean | off                              | Externals-only pass. Same as `enrich`                                                |
| `--git-only`              | boolean | off                              | Architecture scan without prompts, plus forensics enrich                             |
| `--publish`               | boolean | off                              | After scan, upload the output tree with `--no-dry-run`                               |
| `--key-prefix=<path>`     | string  | `OBJECT_STORAGE_KEY_PREFIX`      | Object key prefix inside the bucket                                                  |
| `--workspace-name=<name>` | string  | `blueprints`                     | Workspace name for `entityRef` resolution when publishing                            |
| `--validate`              | boolean | off                              | Fail publish when workspace validation fails                                         |
| `--skip-validation`       | boolean | on                               | Allow publish or compose without a validation gate                                   |

## Commands

| Command                     | Description                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| `(default)`                 | Interactive menu: scan, publish, fragments, compose, overlays            |
| `scan`                      | Scan without prompts. Same as `--scan`                                   |
| `enrich`                    | Re-run the externals pass on existing YAML. Doesn't re-parse source      |
| `validate [path]`           | Architecture health: module cycles and forensics actions                 |
| `diff [baseline] [current]` | Structural diff of two blueprint trees                                   |
| `publish [path]`            | Plan a remote catalog snapshot. Dry run unless `--no-dry-run`            |
| `catalog …`                 | Estate fragments, compose, overlays, prune                               |
| `resilience [path]`         | ChaosLens sweep without prompts, plus ranked recommendations             |
| `update`                    | Install the current release binary, then re-launch. Compiled builds only |
| `help [topic]`              | Show help                                                                |

### `scan`

| Flag                              | Type                        | Default       | Description                                                                    |
| --------------------------------- | --------------------------- | ------------- | ------------------------------------------------------------------------------ |
| `--parser=<engine>`               | `tree-sitter` \| `ts-morph` | `tree-sitter` | AST engine. `ts-morph` is TypeScript-only                                      |
| `--rollup-modules`                | boolean                     | off           | Collapse `*-module-*` package names to the prefix                              |
| `--ignore=<a,b>`                  | csv string                  | empty         | Extra ignore globs                                                             |
| `--systems=<a,b>`                 | csv string                  | empty         | Restrict discovery to these roots                                              |
| `--max-coupling-commit-files=<n>` | number                      | `50`          | Skip temporal coupling for commits that touch more files. `0` disables the cap |

`archlens scan` never prompts. `--headless` on `scan` is the same mode.

### `enrich`

| Flag                 | Type    | Default      | Description                        |
| -------------------- | ------- | ------------ | ---------------------------------- |
| `--output=<dir>`     | string  | `blueprints` | Blueprint folder                   |
| `--git`              | boolean | off          | Also refresh TraceLens git metrics |
| `--git-since=<days>` | number  | `365`        | Lookback when you set `--git`      |

### `validate`

| Flag                     | Type             | Default                           | Description                                           |
| ------------------------ | ---------------- | --------------------------------- | ----------------------------------------------------- |
| `--path=<dir>`           | string           | `blueprints`                      | Blueprint tree. A positional path sets the same value |
| `--format=<format>`      | `text` \| `json` | `text`                            | Output format                                         |
| `--contract`             | boolean          | off                               | Also fail on BlueprintSpec wiring and schema issues   |
| `--since-commit[=<ref>]` | string           | `HEAD~1` when the flag is present | Compare health to blueprints at a git ref             |
| `--baseline=<dir>`       | string           | unset                             | Compare health to another on-disk blueprint tree      |

### `diff`

Exits `1` when the trees differ.

| Flag                | Type             | Default          | Description                                                      |
| ------------------- | ---------------- | ---------------- | ---------------------------------------------------------------- |
| `--baseline=<dir>`  | string           | `blueprints`     | Baseline tree. The first positional argument sets the same value |
| `--current=<dir>`   | string           | same as baseline | Current tree. The second positional argument sets the same value |
| `--format=<format>` | `text` \| `json` | `text`           | Output format                                                    |

### `publish`

| Flag                      | Type                    | Default                                | Description                               |
| ------------------------- | ----------------------- | -------------------------------------- | ----------------------------------------- |
| `--path=<dir>`            | string                  | `blueprints`                           | Blueprint tree                            |
| `--workspace-name=<name>` | string                  | `blueprints`                           | Workspace name for `entityRef` resolution |
| `--provider=<name>`       | `r2` \| `s3` \| `azure` | `OBJECT_STORAGE_PROVIDER` or `r2`      | Object storage provider                   |
| `--format=<format>`       | `text` \| `json`        | `text`                                 | Output format                             |
| `--bucket=<name>`         | string                  | `OBJECT_STORAGE_BUCKET` or `R2_BUCKET` | Bucket or container                       |
| `--account-id=<id>`       | string                  | unset                                  | Cloudflare account id for the R2 endpoint |
| `--key-prefix=<path>`     | string                  | `OBJECT_STORAGE_KEY_PREFIX`            | Object key prefix                         |
| `--no-dry-run`            | boolean                 | off                                    | Upload the snapshot                       |
| `--validate`              | boolean                 | off                                    | Fail when workspace validation fails      |
| `--skip-validation`       | boolean                 | on                                     | Allow upload without a validation gate    |

### `resilience`

| Flag                        | Type                       | Default      | Description                                        |
| --------------------------- | -------------------------- | ------------ | -------------------------------------------------- |
| `--path=<dir>`              | string                     | `blueprints` | Blueprint tree                                     |
| `--chaos-specs=<dir>`       | string                     | unset        | ChaosSpec YAML directory                           |
| `--min-sla=<percent>`       | number                     | `100`        | Exit `1` when the worst SLA is below this percent  |
| `--fail-on-recommendations` | boolean                    | off          | Exit `1` when the command emits any recommendation |
| `--max-region-outages=<n>`  | number                     | `15`         | Cap region-outage scenarios per diagram            |
| `--max-fan-in-probes=<n>`   | number                     | `5`          | Cap fan-in latency probes per diagram              |
| `--format=<format>`         | `text` \| `json` \| `yaml` | `text`       | Output format                                      |
| `--output=<file>`           | string                     | unset        | Write the AdviceLens report to this file           |

### `catalog`

| Command                           | Required flags                          | Description                                           |
| --------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| `catalog publish-fragment [path]` | `--estate`, `--product`, `--source-ref` | Stage a product slice under `fragments/`              |
| `catalog compose`                 | `--estate`                              | Stitch fragments and overlays into `latest`           |
| `catalog accept-overlay`          | `--estate`, `--file`                    | Stage a suggestion overlay                            |
| `catalog reject-overlay`          | `--estate`, `--overlay-id`              | Tombstone an overlay                                  |
| `catalog prune`                   | `--estate`                              | Plan retention deletes. Dry run unless `--no-dry-run` |

`publish-fragment` flags:

| Flag                  | Type    | Default                        | Description                                   |
| --------------------- | ------- | ------------------------------ | --------------------------------------------- |
| `--estate=<id>`       | string  | unset                          | Estate id. Default key prefix `estates/{id}/` |
| `--product=<id>`      | string  | unset                          | Product composition key                       |
| `--system=<id>`       | string  | unset                          | Optional system slice within the product      |
| `--fragment-key=<id>` | string  | `product` or `product--system` | Override the fragment key                     |
| `--source-ref=<ref>`  | string  | unset                          | Repository identity, such as `repo@sha`       |
| `--run-id=<id>`       | string  | UTC timestamp                  | Run id                                        |
| `--path=<dir>`        | string  | `blueprints`                   | Blueprint tree                                |
| `--key-prefix=<path>` | string  | `estates/{estate}/`            | Object key prefix                             |
| `--no-dry-run`        | boolean | off                            | Upload the fragment                           |
| `--validate`          | boolean | off                            | Fail when workspace validation fails          |
| `--skip-validation`   | boolean | on                             | Allow upload without a validation gate        |

`compose` flags:

| Flag                      | Type             | Default             | Description                                  |
| ------------------------- | ---------------- | ------------------- | -------------------------------------------- |
| `--estate=<id>`           | string           | unset               | Estate to compose                            |
| `--workspace-name=<name>` | string           | unset               | Workspace name for validation                |
| `--key-prefix=<path>`     | string           | `estates/{estate}/` | Object key prefix                            |
| `--max-retries=<n>`       | number           | `8`                 | CAS retries on `latest/manifest.json`        |
| `--no-dry-run`            | boolean          | off                 | Upload the composed snapshot                 |
| `--allow-empty`           | boolean          | off                 | Exit `0` when the estate has no fragments    |
| `--validate`              | boolean          | off                 | Fail when the composed tree fails validation |
| `--skip-validation`       | boolean          | on                  | Allow compose without a validation gate      |
| `--format=<format>`       | `text` \| `json` | `text`              | Output format                                |

`prune` flags:

| Flag                       | Type             | Default             | Description                                   |
| -------------------------- | ---------------- | ------------------- | --------------------------------------------- |
| `--estate=<id>`            | string           | unset               | Estate id                                     |
| `--key-prefix=<path>`      | string           | `estates/{estate}/` | Object key prefix                             |
| `--keep-snapshots=<n>`     | number           | `7`                 | Keep at least this many newest snapshots      |
| `--keep-snapshot-days=<n>` | number           | `14`                | Also keep snapshots newer than this many days |
| `--keep-fragment-runs=<n>` | number           | `2`                 | Keep this many newest runs per fragment key   |
| `--no-dry-run`             | boolean          | off                 | Delete the planned keys                       |
| `--format=<format>`        | `text` \| `json` | `text`              | Output format                                 |

`accept-overlay` and `reject-overlay` flags:

| Flag                    | Type    | Default             | Description                                  |
| ----------------------- | ------- | ------------------- | -------------------------------------------- |
| `--estate=<id>`         | string  | unset               | Estate id                                    |
| `--file=<overlay.yaml>` | string  | unset               | Overlay document to stage for accept-overlay |
| `--overlay-id=<id>`     | string  | unset               | Overlay id to tombstone for reject-overlay   |
| `--key-prefix=<path>`   | string  | `estates/{estate}/` | Object key prefix                            |
| `--no-dry-run`          | boolean | off                 | Write the accept or reject to object storage |

## Environment variables

Names only. Don't commit secret values.

| Name                               | Default                  | Description                                                                 |
| ---------------------------------- | ------------------------ | --------------------------------------------------------------------------- |
| `ARCHLENS_OUTPUT_DIR`              | `blueprints`             | Output directory when `--output` is absent                                  |
| `ARCHLENS_INTERACTIVE`             | unset                    | `1` or `true` forces interactive mode                                       |
| `ARCHLENS_VERSION`                 | `dev`                    | Embedded at CLI build time                                                  |
| `ARCHLENS_GITHUB_REPO`             | `mzworthington/archlens` | Release repository for `update`                                             |
| `OBJECT_STORAGE_PROVIDER`          | `r2`                     | `r2`, `s3`, `azure`, or `http`. Alias `STORAGE_PROVIDER`                    |
| `OBJECT_STORAGE_BUCKET`            | unset                    | Bucket or container. Aliases `R2_BUCKET`, `AWS_S3_BUCKET`, `STORAGE_BUCKET` |
| `OBJECT_STORAGE_ACCESS_KEY_ID`     | unset                    | Access key. Aliases `R2_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_ID`                 |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | unset                    | Secret key. Aliases `R2_SECRET_ACCESS_KEY`, `AWS_SECRET_ACCESS_KEY`         |
| `OBJECT_STORAGE_KEY_PREFIX`        | unset                    | Key prefix. Aliases `R2_CATALOG_KEY_PREFIX`, `STORAGE_KEY_PREFIX`           |
| `OBJECT_STORAGE_BASE_URL`          | unset                    | Base URL when the provider is `http`. Alias `STORAGE_BASE_URL`              |
| `R2_ACCOUNT_ID`                    | unset                    | Cloudflare account id. Alias `CLOUDFLARE_ACCOUNT_ID`                        |
| `AWS_REGION`                       | `us-east-1`              | S3 region. Alias `AWS_DEFAULT_REGION`                                       |
| `AWS_ENDPOINT_URL`                 | unset                    | S3 endpoint. Alias `S3_ENDPOINT`                                            |
| `AZURE_STORAGE_CONTAINER`          | unset                    | Azure container. Falls back to `OBJECT_STORAGE_BUCKET`                      |
| `AZURE_STORAGE_CONNECTION_STRING`  | unset                    | Azure connection string                                                     |
| `AZURE_STORAGE_ACCOUNT_URL`        | unset                    | Azure account URL. Used with `AZURE_STORAGE_SAS_TOKEN`                      |
| `AZURE_STORAGE_SAS_TOKEN`          | unset                    | Azure SAS token                                                             |

## Exit codes

| Code  | When                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`   | The command finished                                                                                                                                                |
| `1`   | Validation failed, `diff` found a difference, `resilience` missed `--min-sla` or `--fail-on-recommendations`, the flag is unknown, or the command reported an error |
| `130` | You cancelled the interactive run                                                                                                                                   |
