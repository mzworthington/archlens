# ArchLens for Visual Studio Code

Pre-release extension. It previews a BlueprintSpec file beside the YAML, and it asks before writing a diagram generated from the workspace.

ArchLens does not read a folder until the workspace is trusted.

Site copy of this page: [Editor extension](../../../docs/guide/vscode.md).

## Commands

- **Open architecture map** shows the systems and the links in `blueprints/`. From the command palette, the focused YAML file is the map. A focused source file picks that workspace folder when several roots are open. An empty folder opens the map panel, which says **No map in this folder.** and lists no systems. The recommended YAML extension (`redhat.vscode-yaml`) still provides schema hints. This extension does not replace it.
- **Generate diagram from workspace** asks what to scan and shows **Review blueprint changes**. **Keep current files** leaves the folder unchanged. **Write blueprint** saves the review into `blueprints/`.
- **Compare with a fresh scan** uses that same picker and review. A match says **No changes.** An unsaved blueprint asks you to save or revert before a compare.
- Enter on a system with a child diagram opens that diagram. Alt+Left, or the parent in the breadcrumb, comes back. A system with no child diagram stays put.
- **Copy diagram as Mermaid** copies a flowchart of the systems on screen. The YAML file stays as it is. An empty diagram says **Nothing to copy.**
- Opening or saving a blueprint puts a cycle, or the first failed check, in Problems. YAML that is not a blueprint gets no ArchLens problem. Restricted Mode adds none.
- **Show hotspots** marks systems that a scan already recorded as hotspots, and properties include the change count. A folder with no git history says **Hotspots need a git history for this folder.** and the diagram stays as it is.

## A merge does not publish

A merge to `main` leaves the Visual Studio Marketplace listing unchanged. It also leaves the Open VSX listing unchanged. No workflow runs `vsce publish` or `ovsx publish`. The Marketplace job in [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) stays commented out. CI uploads `archlens-vscode-pre-release` so you can sideload that VSIX. `"private": true` keeps this package off npm. Cursor loads this same package. Its Extensions panel lists extensions from Open VSX, not from the Visual Studio Marketplace.

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

| Check           | What you do                                                             | What you should see                                                                                          |
| --------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Preview         | **ArchLens: Open architecture map**                                     | Systems and links. Read only.                                                                                |
| Generate        | **ArchLens: Generate diagram from workspace**, then **Whole workspace** | **Keep current files** leaves the folder unchanged. **Write blueprint** saves the review and opens that map. |
| Restricted Mode | **Workspaces: Manage Workspace Trust**, then **Don't Trust**            | ArchLens does not read this folder until the workspace is trusted.                                           |

Compile again and run **Developer: Reload Window** after an edit.

### VSIX sideload

```bash
cd app
pnpm --filter ./packages/vscode package:pre-release
code --install-extension packages/vscode/archlens-0.1.0.vsix
```

Version `0.1.0` produces `archlens-0.1.0.vsix`. The Extensions view `…` menu has **Install from VSIX…**. Repeat the checks in a normal window. Uninstall **ArchLens** from that view when you want the copy gone, then reinstall the new VSIX after the next package.

## Marketplace, when you choose to publish

The first publish creates a public listing. VS Code and Cursor do not share that listing.

### Visual Studio Marketplace

The pre-release channel stays off the default **Install** button.

1. Create publisher `mzworthington` at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage).
2. Create an Azure DevOps Personal Access Token with **Marketplace (Manage)**.
3. `npx @vscode/vsce login mzworthington`
4. `npx @vscode/vsce publish --pre-release` (or upload that VSIX on the management page).
5. A stable release is later: `npx @vscode/vsce publish` with a new version and no `--pre-release` flag.

Use `0.1.x` for pre-release and `0.2.x` for the first stable release. Each `major.minor.patch` can be published once. Publish the next pre-release before a release when testers should stay on the experiment.

### Cursor

Cursor's Extensions search reads Open VSX. Publish the same pre-release VSIX under the namespace `mzworthington`.

1. Sign in at [open-vsx.org](https://open-vsx.org), link an Eclipse account and sign the Publisher Agreement.
2. Create an access token.
3. `npx ovsx create-namespace mzworthington -p "$OVSX_PAT"` once.
4. `npx ovsx publish archlens-0.1.0.vsix --pre-release -p "$OVSX_PAT"`.

Cursor search can lag that publish. Until then, install the VSIX in Cursor the same way as in VS Code.

Turn on GitHub Discussions before the first pre-release. **Tell us you want this** opens `https://github.com/mzworthington/archlens/discussions`. Count a pre-release install from each registry's report. Count a discussion open from that link. A development-host click stays local.

On 2027-02-06, keep **Open architecture map** and remove **Generate diagram from workspace** if fewer than 30 people have installed a pre-release, or if 30 or more have installed one and under 10% have opened the discussion. Stable **Install** stays unused until you publish a release version on purpose.
