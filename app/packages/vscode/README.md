# ArchLens for Visual Studio Code

Pre-release extension. It previews a BlueprintSpec file beside the YAML, and it asks before generating a diagram from the workspace.

Generation is off. **Generate diagram from workspace** explains that, and **Tell us you want this** opens the GitHub discussion. Nothing is scanned and nothing is written.

ArchLens does not read a folder until the workspace is trusted.

Site copy of this page: [Editor extension](../../../docs/guide/vscode.md).

## Commands

- **Open architecture map** shows the systems and the links in `blueprints/`. From the command palette, the focused YAML file is the map. A focused source file picks that workspace folder when several roots are open. An empty folder opens the map panel, which says **No map in this folder.** and lists no systems. The recommended YAML extension (`redhat.vscode-yaml`) still provides schema hints. This extension does not replace it.
- **Generate diagram from workspace** opens the interest prompt while generation is off. Turning `archlens.generateFromWorkspace.enabled` on asks what to scan and shows **Review blueprint changes**. **Keep current files** leaves the folder unchanged. **Write blueprint** saves the review into `blueprints/`.
- **Compare with a fresh scan** uses that same prompt, picker, and review. A match says **No changes.** An unsaved blueprint asks you to save or revert before a compare.
- **Open source**, with a system focused on the diagram, opens the file that system points at. A system with no file in the workspace stays on the diagram.
- Enter on a system with a child diagram opens that diagram. Alt+Left, or the parent in the breadcrumb, comes back. A system with no child diagram stays put.
- **Copy diagram as Mermaid** copies a flowchart of the systems on screen. The YAML file stays as it is. An empty diagram says **Nothing to copy.**
- Opening or saving a blueprint puts a cycle, or the first failed check, in Problems. YAML that is not a blueprint gets no ArchLens problem. Restricted Mode adds none.
- **Show hotspots** marks systems that a scan already recorded as hotspots, and properties include the change count. A folder with no git history says **Hotspots need a git history for this folder.** and the diagram stays as it is.

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

| Check           | What you do                                                                                           | What you should see                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Preview         | **ArchLens: Open architecture map**                                                                   | Systems and links. Read only.                                                                                |
| Interest prompt | **ArchLens: Generate diagram from workspace**                                                         | Generation is off. **Tell us you want this** opens the discussion.                                           |
| Generate on     | Turn on `archlens.generateFromWorkspace.enabled`, then run the command and choose **Whole workspace** | **Keep current files** leaves the folder unchanged. **Write blueprint** saves the review and opens that map. |
| Restricted Mode | **Workspaces: Manage Workspace Trust**, then **Don't Trust**                                          | ArchLens does not read this folder until the workspace is trusted.                                           |

Compile again and run **Developer: Reload Window** after an edit.

### VSIX sideload

```bash
cd app
pnpm --filter ./packages/vscode package:pre-release
code --install-extension packages/vscode/archlens-0.1.0.vsix
```

Version `0.1.0` produces `archlens-0.1.0.vsix`. The Extensions view `…` menu has **Install from VSIX…**. Repeat the checks in a normal window. Uninstall **ArchLens** from that view when you want the copy gone, then reinstall the new VSIX after the next package.

## Marketplace, when you choose to publish

The first publish creates a public listing. The pre-release channel stays off the default **Install** button.

1. Create publisher `mzworthington` at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage).
2. Create an Azure DevOps Personal Access Token with **Marketplace (Manage)**.
3. `npx @vscode/vsce login mzworthington`
4. `npx @vscode/vsce publish --pre-release` (or upload that VSIX on the management page).
5. A stable release is later: `npx @vscode/vsce publish` with a new version and no `--pre-release` flag.

Use `0.1.x` for pre-release and `0.2.x` for the first stable release. Each `major.minor.patch` can be published once. Publish the next pre-release before a release when testers should stay on the experiment.

Turn on GitHub Discussions before the first pre-release. **Tell us you want this** opens `https://github.com/mzworthington/archlens/discussions`. The bet counts Marketplace pre-release installs and discussion opens. A development-host click stays local.
