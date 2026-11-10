# Editor extension

ArchLens for Visual Studio Code previews a BlueprintSpec file beside the YAML. **Generate diagram from workspace** is off in this preview. The prompt says generation is off and offers `Tell us you want this`. That action opens the GitHub discussion. The command doesn't scan, and it doesn't write files.

Turn on `archlens.generateFromWorkspace.enabled` when you want a scan. The command then shows **Review blueprint changes** with a count of added, changed, and removed systems. **Keep current files** writes nothing. **Write blueprint** saves that review.

The package is [app/packages/vscode](../../app/packages/vscode). The publisher id in `package.json` is `mzworthington`. `"preview": true` marks the listing as a preview. `"private": true` keeps the package off npm. A later manual `vsce` command can still package it.

A merge to `main` leaves the Visual Studio Marketplace listing unchanged, and it leaves the Open VSX listing that Cursor searches unchanged. No workflow runs `vsce publish` or `ovsx publish`. The only publish job in CI ships the ArchLens CLI to GitHub Releases. The Marketplace job stays commented out in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). See [Workflows](./ci-workflows.md).

The extension needs VS Code or Cursor on `engines.vscode` `^1.95.0`.

## Local sandbox

Use two loops. The extension development host is for daily changes. A Visual Studio Extension (VSIX) install is a dress rehearsal of the file a marketplace would install. Neither loop creates a listing.

### Extension development host

Compile first. `main` points at `dist/extension.js`.

```bash
cd app
pnpm install
pnpm --filter ./packages/vscode compile
```

From `app/packages/vscode`, open a second window with this repo as the fixture. The checked-in `blueprints/` tree is enough.

```bash
cd app/packages/vscode
code --extensionDevelopmentPath="$PWD" "$PWD/../../.."
```

Cursor uses the same flag:

```bash
cursor --extensionDevelopmentPath="$PWD" "$PWD/../../.."
```

In that window:

| Check           | What you do                                                                                                 | What you should see                                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preview         | Command Palette, then `ArchLens: Open architecture map`. Or right-click `blueprints/` or a `.yaml` file.    | Systems and links from the file. You can read the diagram there, and you can't edit it. A folder with no blueprint opens the same panel and says **No map in this folder.** Tab to a system to focus its name. |
| Interest prompt | Command Palette, then `ArchLens: Generate diagram from workspace`.                                          | `Generating a diagram from code is turned off in this preview.` `Tell us you want this` opens the discussion. **Cancel** closes the prompt.                                                                    |
| Generate on     | Turn on `archlens.generateFromWorkspace.enabled`, then run the command and choose **Whole workspace**.      | **Review blueprint changes** counts added, changed, and removed systems. **Keep current files** or Escape leaves the folder unchanged. **Write blueprint** saves the review and opens that map.                |
| Restricted Mode | Command Palette, then `Workspaces: Manage Workspace Trust`, then **Don't Trust**. Run either command again. | `ArchLens doesn't read this folder until the workspace is trusted.`                                                                                                                                            |
| Open source     | Focus a system on the diagram, then `ArchLens: Open source`.                                                | The file that system points at opens. The status bar names the path and the system. A system with no file stays on the diagram.                                                                                |
| Drill           | Focus a system and press Enter. Press Alt+Left, or choose the parent in the breadcrumb.                     | The child diagram replaces the Canvas. A system with no child diagram stays put.                                                                                                                               |
| Copy            | `ArchLens: Copy diagram as Mermaid`.                                                                        | The clipboard gets a flowchart. The YAML file stays unchanged. An empty diagram says nothing to copy.                                                                                                          |
| Theme           | `archlens.theme` stays on Light, or set it to System.                                                       | Light is the map you open. System follows the operating system appearance.                                                                                                                                     |
| Problems        | Open a blueprint that contains a cycle, then remove the cycle and save.                                     | Problems names both systems and the file. Saving clears the problem. A notes file gets no ArchLens problem.                                                                                                    |

After an edit, compile again and run `Developer: Reload Window` in the host.

To start the same host with F5, open `app/packages/vscode` and use a launch config with `"type": "extensionHost"`, `--extensionDevelopmentPath=${workspaceFolder}`, and the fixture folder.

### VSIX sideload

```bash
cd app
pnpm --filter ./packages/vscode package:pre-release
code --install-extension packages/vscode/archlens-0.1.0.vsix
```

The current version is `0.1.0`, so the file name is `archlens-0.1.0.vsix`. `vsce` marks that file as a pre-release with `--pre-release`. A semver tag such as `0.1.0-preview.1` isn't a Marketplace version. In the Extensions view, the `…` menu has **Install from VSIX…**. Reload the window and repeat the checks above in a normal window, outside the development host.

CI uploads the same package as the `archlens-vscode-pre-release` artifact on the unit-tests job. Download that file and install it the same way.

Uninstall **ArchLens** from the Extensions view when you want that copy gone. Package again and reinstall the new VSIX after each change. A Marketplace update doesn't replace it, because there is no listing yet.

## Marketplace, when you choose to publish

The public Marketplace has no hidden sandbox. The first publish creates a public listing. The pre-release channel stays off the default **Install** button. Cursor's listing is the Open Visual Studio Extension (VSX) registry, so publish there separately with `npx ovsx publish --pre-release` after `npx ovsx create-namespace mzworthington`.

1. Create the publisher `mzworthington` at [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage). The name matches `publisher` in `package.json`.
2. In Azure DevOps, create a Personal Access Token with the Marketplace Manage scope.
3. From `app/packages/vscode`, sign in once with `npx @vscode/vsce login mzworthington`.
4. Publish the opt-in build with `npx @vscode/vsce publish --pre-release`. You can also upload the pre-release VSIX on the management page. The listing is public. VS Code shows **Install Pre-Release Version**. People who leave that switch off don't get the build.
5. A stable release is a later command, `npx @vscode/vsce publish`, with no `--pre-release` flag, and a new version number.

Microsoft keeps one slot per `major.minor.patch`. `0.1.0` can be the pre-release or the release, and then you have spent that number. Use an odd minor for pre-release, `0.1.x`, which this package already uses, and the next even minor for the release, `0.2.x`. VS Code moves someone who opted into pre-release onto a release version when that release has a higher number. Publish the next pre-release before the release when testers should stay on the experiment.

Turn on GitHub Discussions for `mzworthington/archlens` before that first pre-release publish. `Tell us you want this` opens [the discussions page](https://github.com/mzworthington/archlens/discussions). The bet counts installs from the Marketplace pre-release report and opens of that discussion. A click in the development host stays local.

On 2027-02-06, stop the generate-from-code work if fewer than 30 people have installed the pre-release, or if 30 or more have installed it and under 10% have opened the discussion. Stable **Install** stays unused until you publish a release version on purpose.
