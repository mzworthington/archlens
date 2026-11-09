# Generate container diagrams in GitHub Actions

Produce BlueprintSpec context, container, and component diagrams on every pull request.

Prerequisite: a GitHub repository with Actions enabled. The workflow installs the ArchLens CLI and runs a headless scan. Object-storage publish is a separate task.

## Steps

1. Add `.github/workflows/archlens-scan.yml`:

```yaml
name: ArchLens scan

on:
  pull_request:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install ArchLens CLI
        run: |
          curl --proto '=https' --tlsv1.2 -fsSL \
            https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh \
            -o /tmp/archlens-install.sh
          bash /tmp/archlens-install.sh --dir "$HOME/.local/bin"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"

      - name: Scan
        run: archlens scan --headless --output=blueprints

      - name: Upload diagrams
        uses: actions/upload-artifact@v4
        with:
          name: blueprints
          path: blueprints
```

`fetch-depth: 0` keeps git history so TraceLens can attach churn. Drop it when you want structure only, and pass `--no-git` to `archlens scan`.

2. Open a pull request that changes the workflow.
3. Download the `blueprints` artifact from the job.

## Expected output

The scan step exits `0`. The log includes the CLI version from the install step. The artifact contains YAML for the context diagram, container diagrams, and component diagrams.

## Check

Open a container YAML file from the artifact. `metadata.entityRef` has two segments, such as `context/system`. Nodes in that file are containers. Flag details are in the [CLI reference](/reference/cli).
