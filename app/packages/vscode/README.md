# ArchLens

Preview a BlueprintSpec architecture map beside the YAML in Visual Studio Code.

This is a Marketplace **pre-release**. It does not scan your repository and it does not write blueprint files.

## Open an existing map

Open a trusted folder that already has a blueprint under `blueprints/`. Run **Open architecture map**. A panel lists the systems and the links between them. The YAML stays the file you edit. The recommended YAML extension (`redhat.vscode-yaml`) still provides schema hints. This extension does not replace it.

If the folder has no blueprint, the panel says **No map in this folder.**

## Generate a diagram from the workspace

**Generate diagram from workspace** is off in this preview.

You see **Generating a diagram from code is turned off in this preview.** **Tell us you want this** opens the GitHub discussion at <https://github.com/mzworthington/archlens/discussions>. **Cancel** and Escape close the prompt. Nothing is scanned and no file changes.

The setting `archlens.generateFromWorkspace.enabled` defaults to off. Turning it on does not scan or write files in this pre-release.

## Restricted Mode

In an untrusted workspace, **Open architecture map** and **Generate diagram from workspace** say **ArchLens does not read this folder until the workspace is trusted.** No blueprint is read.

## Publish this pre-release

Maintainers publish with `vsce publish --pre-release` from this package (`pnpm package:pre-release` builds the vsix). Turn on GitHub Discussions for `mzworthington/archlens` before publishing, so **Tell us you want this** opens a real discussion. Do not publish a stable Marketplace version from this preview.
