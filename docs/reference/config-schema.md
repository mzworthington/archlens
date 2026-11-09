# Config schema

`blueprint.config.json`, `blueprint.config.yml`, or `blueprint.config.yaml` sets scan and TraceLens defaults for the repository you scan. The CLI reads the first matching file in the scan root. It doesn't walk parent directories.

CLI flags override these keys. Flag types are in the [CLI reference](/reference/cli).

## Top level

| Key             | Type     | Default                          | Description                                                                |
| --------------- | -------- | -------------------------------- | -------------------------------------------------------------------------- |
| `ignore`        | string[] | `[]`                             | Extra ignore globs. Merged with structural ignores and `.gitignore`        |
| `include`       | string[] | `[]`                             | When non-empty, a path must match at least one glob                        |
| `systems`       | string[] | `[]`                             | Repository-relative roots. Empty means autodetect workspaces and packages  |
| `systemName`    | string   | unset                            | Name this repository on the context diagram for a multi-repository product |
| `rollupModules` | boolean  | `false`                          | Collapse `*-module-*` package names to the prefix before `-module-`        |
| `glob`          | string   | `**/*.{ts,tsx,cs,java,go,py,tf}` | Source glob. Same default as `--glob`                                      |
| `context`       | string   | `blueprint`                      | Root `entityRef` slug. Same default as `--context`                         |

```json
{
  "ignore": ["**/generated/**"],
  "include": [],
  "systems": ["packages", "plugins"],
  "systemName": "frontend-api",
  "rollupModules": false,
  "glob": "**/*.{ts,tsx}",
  "context": "my-product"
}
```

## `forensics`

Optional object. TraceLens uses these thresholds when git signals are on.

| Key                            | Type     | Default                              | Description                                                                      |
| ------------------------------ | -------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| `sinceDays`                    | number   | `365`                                | Lookback for churn, authors, and coupling                                        |
| `shortChurnDays`               | number   | `30`                                 | Short churn window. `0` disables the second window                               |
| `hotspotThreshold`             | number   | `0.5`                                | Minimum hotspot score classified as Hotspot                                      |
| `complexityThreshold`          | number   | `10`                                 | Minimum complexity considered for a knowledge silo                               |
| `siloTopAuthorPercent`         | number   | `1`                                  | Minimum dominant-author share. `1` means a sole author                           |
| `minSharedCommits`             | number   | `5`                                  | Minimum shared commits before reporting a coupling pair                          |
| `couplingThreshold`            | number   | `0.75`                               | Minimum coupling score for a reported pair                                       |
| `maxFilesPerCommitForCoupling` | number   | `50`                                 | Skip coupling for larger commits. `0` disables the cap                           |
| `minChurnForComplexity`        | number   | `0`                                  | Skip AST complexity below this churn. `0` always runs AST. Line counts still run |
| `glob`                         | string   | `**/*.{ts,tsx,cs,java,go,py,js,jsx}` | forensics file glob                                                              |
| `ignore`                       | string[] | `[]`                                 | Extra ignore globs, appended to the top-level `ignore` list                      |
| `include`                      | string[] | top-level `include`                  | Include filter for forensics files                                               |

```json
{
  "forensics": {
    "sinceDays": 90,
    "hotspotThreshold": 0.5,
    "complexityThreshold": 10,
    "minSharedCommits": 5,
    "couplingThreshold": 0.75
  }
}
```
