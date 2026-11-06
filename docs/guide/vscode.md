# Visual Studio Code

ArchLens on the Visual Studio Marketplace is a pre-release. It previews a BlueprintSpec file beside the YAML. When generation is on, a later release can build a diagram from the open folder. This pre-release does not scan and does not write files.

The YAML extension (`redhat.vscode-yaml`) still provides schema autocomplete. ArchLens does not replace it.

## Install

Install **ArchLens** from the Marketplace pre-release channel. The extension adds two commands to the command palette and the explorer context menu. It does not open a diagram until you ask.

## Workspace trust

In Restricted Mode, ArchLens does not read this folder until the workspace is trusted. No blueprint is read, and nothing is written.

## Open a map

**Open architecture map** on a blueprint file, or on the `blueprints` folder, opens the diagram beside the YAML.

- A BlueprintSpec file shows its systems and the links between them.
- A folder with no blueprint says: No map in this folder.
- A YAML file that is not a blueprint stays in the normal text editor.
- Saving the YAML refreshes the diagram.
- The diagram is read only. You change the map by editing the YAML.

Move focus onto a system with the keyboard. Its name is the focused item. Properties show `name` and `entityRef`.

If the workspace has several folders, choose a folder. ArchLens does not merge those roots into one estate.

## Generate from the workspace

**Generate diagram from workspace** is in the command palette and on a folder's context menu.

Generation is turned off. You see: Generating a diagram from code is turned off in this preview.

- **Tell us you want this** opens the GitHub discussion.
- **Cancel**, Escape, or closing the prompt writes nothing.

No scan runs. No files change.

The setting **Generate a diagram from the workspace** (`archlens.generateFromWorkspace.enabled`) defaults to off. Turning it on in this pre-release still does not scan. Scan and review wait on the discussion signal, decided on 2027-02-06.
