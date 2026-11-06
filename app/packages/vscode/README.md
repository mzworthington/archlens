# ArchLens for Visual Studio Code

Pre-release extension. It previews a BlueprintSpec file beside the YAML and asks whether you want a diagram generated from the workspace. Generation does not scan and does not write files.

Product guide: [docs/guide/vscode.md](../../../docs/guide/vscode.md). Bet card: [docs/vscode-marketplace-extension-prd.md](../../../docs/vscode-marketplace-extension-prd.md).

## Commands

| Command                         | Behavior                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open architecture map           | Read-only diagram of systems and links. Empty folder: No map in this folder.                                                                      |
| Generate diagram from workspace | Generating a diagram from code is turned off in this preview. Tell us you want this opens the GitHub discussion. Cancel and Escape write nothing. |

Restricted Mode shows: ArchLens does not read this folder until the workspace is trusted. The extension does not read the folder.

## Settings

| Setting                                  | Default      |
| ---------------------------------------- | ------------ |
| `archlens.generateFromWorkspace.enabled` | `false`      |
| `archlens.blueprintsFolder`              | `blueprints` |

The flag expires 2027-02-06. Off is the interest prompt. This package does not scan even if the flag is turned on. Scan, review and compare are later stories.

The discussion link is `https://github.com/mzworthington/archlens/discussions`. It is not a workspace setting, so a repo cannot redirect it. Enable GitHub Discussions on the repository before publishing the pre-release, or the link 404s and the indicator cannot be counted.

## Develop

```bash
cd app
pnpm --filter @archlens/vscode test
pnpm --filter @archlens/vscode typecheck
pnpm --filter @archlens/vscode build
```

`build` writes `dist/extension.cjs` (gitignored). Launch an Extension Development Host with `--extensionDevelopmentPath` pointed at this folder.

Marketplace id: `mzworthington.archlens`. Version `0.1.0-preview.1`. Publish with `vsce publish --pre-release` once the publisher exists. Do not publish a stable release for this bet.
