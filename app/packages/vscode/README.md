# ArchLens for Visual Studio Code

Pre-release extension. It previews a BlueprintSpec file beside the YAML, and it asks before generating a diagram from the workspace.

Generation is off. **Generate diagram from workspace** explains that, and **Tell us you want this** opens the GitHub discussion. Nothing is scanned and nothing is written.

ArchLens does not read a folder until the workspace is trusted.

Site copy of this page: [Editor extension](../../../docs/guide/vscode.md).

## Commands

- **Open architecture map** shows the systems and the links in `blueprints/`. From the command palette, the focused YAML file is the map. A focused source file picks that workspace folder when several roots are open. An empty folder says **No map in this folder.** The recommended YAML extension (`redhat.vscode-yaml`) still provides schema hints. This extension does not replace it.
- **Generate diagram from workspace** opens the interest prompt. Turning `archlens.generateFromWorkspace.enabled` on still does not scan or write files in this preview.

## A merge does not publish

A merge to `main` leaves the Visual Studio Marketplace listing unchanged. No workflow runs `vsce publish`. The Marketplace job in [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) stays commented out. CI uploads `archlens-vscode-pre-release` so you can sideload that VSIX. `"private": true` keeps this package off npm.

Publisher id: `mzworthington`. `"preview": true` marks the listing as a preview.

## Local sandbox

The Extension Development Host is for daily changes. A VSIX install is a dress rehearsal of the packaged file. Neither one creates a listing.

### Extension Development Host

```bash
cd app
pnpm install
pnpm --filter ./packages/vscode compile
cd packages/vscode
code --extensionDevelopmentPath="$PWD" "$PWD/../../.."
```

Cursor: `cursor --extensionDevelopmentPath="$PWD" "$PWD/../../.."`.

The second window opens this repo. `blueprints/` is the fixture.

| Check           | What you do                                                  | What you should see                                                |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Preview         | **ArchLens: Open architecture map**                          | Systems and links. Read only.                                      |
| Interest prompt | **ArchLens: Generate diagram from workspace**                | Generation is off. **Tell us you want this** opens the discussion. |
| Restricted Mode | **Workspaces: Manage Workspace Trust**, then **Don't Trust** | ArchLens does not read this folder until the workspace is trusted. |

Compile again and run **Developer: Reload Window** after an edit.

### VSIX sideload

```bash
cd app
pnpm --filter ./packages/vscode package:pre-release
code --install-extension packages/vscode/archlens-0.1.0.vsix
```

Version `0.1.0` produces `archlens-0.1.0.vsix`. The Extensions view `…` menu has **Install from VSIX…**. Repeat the three checks in a normal window. Uninstall **ArchLens** from that view when you want the copy gone, then reinstall the new VSIX after the next package.

## Marketplace, when you choose to publish

The first publish creates a public listing. The pre-release channel stays off the default **Install** button.

1. Create publisher `mzworthington` at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage).
2. Create an Azure DevOps Personal Access Token with **Marketplace (Manage)**.
3. `npx @vscode/vsce login mzworthington`
4. `npx @vscode/vsce publish --pre-release` (or upload that VSIX on the management page).
5. A stable release is later: `npx @vscode/vsce publish` with a new version and no `--pre-release` flag.

Use `0.1.x` for pre-release and `0.2.x` for the first stable release. Each `major.minor.patch` can be published once. Publish the next pre-release before a release when testers should stay on the experiment.

Turn on GitHub Discussions before the first pre-release. **Tell us you want this** opens `https://github.com/mzworthington/archlens/discussions`. The bet counts Marketplace pre-release installs and discussion opens. A development-host click stays local.
