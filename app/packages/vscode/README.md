# ArchLens for Visual Studio Code

Pre-release extension. It previews a BlueprintSpec file beside the YAML, and it asks before generating a diagram from the workspace.

Generation is off. **Generate diagram from workspace** explains that, and **Tell us you want this** opens the GitHub discussion. Nothing is scanned and nothing is written.

ArchLens does not read a folder until the workspace is trusted.

## Commands

- **Open architecture map** shows the systems and the links in `blueprints/`.
- **Generate diagram from workspace** opens the interest prompt while `archlens.generateFromWorkspace.enabled` is off.

## Package

```bash
cd app
pnpm --filter ./packages/vscode compile
```

The Marketplace pre-release is the `preview` package produced from `app/packages/vscode`. Publishing needs the ArchLens publisher account. This repository does not publish it from CI.
