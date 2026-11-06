# Editor extension

ArchLens for Visual Studio Code previews a BlueprintSpec file beside the YAML. **Generate diagram from workspace** explains that generation is off and offers **Tell us you want this**. That action opens the GitHub discussion. The command does not scan and it does not write files.

The package is [app/packages/vscode](../../app/packages/vscode). The publisher id in `package.json` is `mzworthington`. `"preview": true` marks the listing as a preview. `"private": true` keeps the package off npm. A later manual `vsce` command can still package it.

A merge to `main` leaves the Visual Studio Marketplace listing unchanged. No workflow runs `vsce publish`. The only publish job in CI ships the ArchLens CLI to GitHub Releases. The Marketplace job stays commented out in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). See [GitHub Actions workflows](./ci-workflows.md).

The extension needs VS Code or Cursor on `engines.vscode` (`^1.85.0`).

## Local sandbox

Use two loops. The Extension Development Host is for daily changes. A VSIX install is a dress rehearsal of the file the Marketplace would install. Neither loop creates a listing.

### Extension Development Host

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

| Check           | What you do                                                                                              | What you should see                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Preview         | Command Palette: **ArchLens: Open architecture map**. Or right-click `blueprints/` or a `.yaml` file.    | Systems and links from the file. The diagram is read only.                                                                                    |
| Interest prompt | Command Palette: **ArchLens: Generate diagram from workspace**.                                          | "Generating a diagram from code is turned off in this preview." **Tell us you want this** opens the discussion. **Cancel** closes the prompt. |
| Restricted Mode | Command Palette: **Workspaces: Manage Workspace Trust**, then **Don't Trust**. Run either command again. | "ArchLens does not read this folder until the workspace is trusted."                                                                          |

After an edit, compile again and run **Developer: Reload Window** in the host.

To start the same host with F5, open `app/packages/vscode` and use a launch config with `"type": "extensionHost"` and args `--extensionDevelopmentPath=${workspaceFolder}` plus the fixture folder.

### VSIX sideload

```bash
cd app/packages/vscode
pnpm compile
npx @vscode/vsce package --pre-release
code --install-extension ./archlens-0.1.0.vsix
```

The current version is `0.1.0`, so the file name is `archlens-0.1.0.vsix`. In the Extensions view, the `…` menu has **Install from VSIX…**. Reload the window and repeat the three checks above in a normal window, outside the development host.

Uninstall **ArchLens** from the Extensions view when you want that copy gone. Package again and reinstall the new VSIX after each change. A Marketplace update will not replace it, because there is no listing yet.

## Marketplace, when you choose to publish

The public Marketplace has no hidden sandbox. The first publish creates a public listing. The pre-release channel stays off the default **Install** button.

1. Create the publisher `mzworthington` at [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage). The name matches `publisher` in `package.json`.
2. In Azure DevOps, create a Personal Access Token with the **Marketplace (Manage)** scope.
3. From `app/packages/vscode`, sign in once: `npx @vscode/vsce login mzworthington`.
4. Publish the opt-in build: `npx @vscode/vsce publish --pre-release`. You can also upload the pre-release VSIX on the management page. The listing is public. VS Code shows **Install Pre-Release Version**. People who leave that switch off do not get the build.
5. A stable release is a later command: `npx @vscode/vsce publish` with no `--pre-release` flag, and a new version number.

Microsoft keeps one slot per `major.minor.patch`. `0.1.0` can be the pre-release or the release, and then that number is spent. Use an odd minor for pre-release (`0.1.x`, which this package already uses) and the next even minor for the release (`0.2.x`). VS Code moves someone who opted into pre-release onto a release version when that release has a higher number. Publish the next pre-release before the release when testers should stay on the experiment.

Turn on GitHub Discussions for `mzworthington/archlens` before that first pre-release publish. **Tell us you want this** opens [the discussions page](https://github.com/mzworthington/archlens/discussions). The bet counts installs from the Marketplace pre-release report and opens of that discussion. A click in the development host stays local.

The decision date and the kill line are in [the Marketplace bet](../vscode-marketplace-extension-prd.md). Stable **Install** stays unused until you publish a release version on purpose.
