import pc from 'picocolors';
import { helpRowsFor } from './flagCatalog.ts';

function heading(text: string): void {
  console.log(pc.bold(pc.cyan(`\n${text}`)));
}

function line(text = ''): void {
  console.log(text);
}

function command(name: string, summary: string): void {
  console.log(`  ${pc.bold(pc.white(name.padEnd(22)))} ${pc.dim(summary)}`);
}

function flag(name: string, summary: string): void {
  console.log(`  ${pc.cyan(name.padEnd(28))} ${summary}`);
}

function example(text: string): void {
  console.log(`  ${pc.dim('$')} ${pc.white(text)}`);
}

export function printOverviewHelp(): void {
  heading('USAGE');
  line(`  ${pc.white('archlens')} ${pc.dim('[command] [options]')}`);
  line('');
  line(`  ${pc.dim('Run with no arguments in a terminal for the guided wizard.')}`);
  line(`  ${pc.dim('Use')} ${pc.white('scan')} ${pc.dim('or flags for CI / scripts.')}`);

  heading('COMMANDS');
  command('(default)', 'Interactive menu - scan, publish, fragments, compose, overlays');
  command('scan', 'Headless architecture scan (uses blueprint.config.json + defaults)');
  command('enrich', 'Re-run externals pass on existing YAML (no source re-scan)');
  command(
    'validate [path]',
    'Architecture health: cycles + forensics actions (optional --contract / --since-commit)'
  );
  command('publish [path]', 'Plan remote catalog snapshot upload (dry run by default)');
  command('catalog …', 'Estate fragments: publish-fragment + compose (ADR-0014)');
  command('resilience [path]', 'Headless ChaosLens sweep + ranked recommendations');
  command('diff [base] [head]', 'Structural diff between two blueprint trees');
  command('update', 'Install the latest release binary (compiled builds only)');
  command(
    'help [topic]',
    'Show help (topics: scan, enrich, validate, diff, publish, catalog, resilience, update)'
  );

  heading('COMMON FLAGS');
  for (const row of helpRowsFor('overview')) {
    flag(row.label, row.summary);
  }

  heading('EXAMPLES');
  example('archlens');
  example('archlens scan --output=blueprints');
  example('archlens scan --headless --output=blueprints --publish');
  example('archlens scan --headless --no-git --glob="**/*.{ts,tsx}"');
  example('archlens enrich');
  example('archlens enrich --git --git-since=90');
  example('archlens validate blueprints/ --since-commit=HEAD~1');
  example('archlens publish blueprints/ --format=json');
  example('archlens resilience blueprints/chaoslens-stress/');
  example('archlens diff main-blueprints/ pr-blueprints/');
  example('archlens help scan');

  heading('ENVIRONMENT');
  flag('ARCHLENS_OUTPUT_DIR', 'Default output directory');
  flag('ARCHLENS_INTERACTIVE=1', 'Force interactive mode in CI / non-TTY');
  line('');
  line(`  ${pc.dim('Docs:')} ${pc.cyan('docs/guide/cli.md')} ${pc.dim('in the ArchLens repo')}`);
}

export function printScanHelp(): void {
  heading('archlens scan');
  line(`  ${pc.dim('Non-interactive architecture scan from source to BlueprintSpec.')}`);
  line('');

  heading('USAGE');
  example('archlens scan [options]');
  example('archlens --scan [options]');

  heading('OPTIONS');
  for (const row of helpRowsFor('scan')) {
    flag(row.label, row.summary);
  }

  heading('EXAMPLES');
  example('archlens scan');
  example('archlens scan --output=blueprints --no-git');
  example('archlens scan --output=blueprints --publish');
  example('archlens scan --output=blueprints --publish --validate');
  example(
    'archlens scan --output=blueprints --key-prefix=estates/samples --workspace-name=samples --publish'
  );
  example('archlens scan --glob="packages/**/*.ts" --context=my-app');
  example('archlens scan --context=acme --system-name=frontend-api');
}

export function printEnrichHelp(): void {
  heading('archlens enrich');
  line(`  ${pc.dim('Refresh cross-diagram dependency edges on existing YAML.')}`);
  line(`  ${pc.dim('Does not re-parse source - use after upgrades or hand-edited blueprints.')}`);
  line('');

  heading('USAGE');
  example('archlens enrich [options]');
  example('archlens --enrich-only [options]');

  heading('OPTIONS');
  flag('--output=<dir>', 'Blueprint folder (default: blueprints)');
  flag('--git', 'Also refresh TraceLens git metrics on nodes');
  flag('--git-since=<days>', 'Forensics lookback when --git is set');

  heading('EXAMPLES');
  example('archlens enrich');
  example('archlens enrich --git --git-since=365');
}

export function printValidateHelp(): void {
  heading('archlens validate');
  line(
    `  ${pc.dim('Report what to fix in the codebase: actionable module direct-call cycles and')}`
  );
  line(
    `  ${pc.dim('TraceLens forensics (hotspots, silos, heating). Other coupling cycles are informational.')}`
  );
  line(
    `  ${pc.dim('Wiring/schema contract checks are opt-in via --contract (also used by publish --validate).')}`
  );
  line('');

  heading('USAGE');
  example('archlens validate [path] [options]');

  heading('OPTIONS');
  flag('--path=<dir>', 'Blueprint tree (default: blueprints)');
  flag('--format=text|json', 'Output format (default: text)');
  flag('--contract', 'Also fail on BlueprintSpec wiring/schema issues');
  flag('--since-commit[=<ref>]', 'Compare health to blueprints at git ref (default HEAD~1)');
  flag('--baseline=<dir>', 'Compare health to another on-disk blueprint tree');

  heading('EXAMPLES');
  example('archlens validate');
  example('archlens validate blueprints/ --since-commit=HEAD~1');
  example('archlens validate blueprints/ --baseline=.archlens/base-blueprints');
  example('archlens validate custom-blueprints/ --contract --format=json');
}

export function printDiffHelp(): void {
  heading('archlens diff');
  line(`  ${pc.dim('Compare two blueprint trees for added/removed/changed nodes and edges.')}`);
  line(`  ${pc.dim('Exits with code 1 when trees differ (CI-friendly).')}`);
  line('');

  heading('USAGE');
  example('archlens diff [baseline] [current] [options]');

  heading('OPTIONS');
  flag('--baseline=<dir>', 'Baseline tree (default: blueprints)');
  flag('--current=<dir>', 'Current tree (default: same as baseline)');
  flag('--format=text|json', 'Output format (default: text)');

  heading('EXAMPLES');
  example('archlens diff base-blueprints/ head-blueprints/');
  example('archlens diff --baseline=main --current=pr --format=json');
}

export function printResilienceHelp(): void {
  heading('archlens resilience');
  line(
    `  ${pc.dim('Run headless ChaosLens failure simulations across blueprint diagrams and rank recommendations.')}`
  );
  line('');

  heading('USAGE');
  example('archlens resilience [path] [options]');

  heading('OPTIONS');
  flag('--path=<dir>', 'Blueprint tree (default: blueprints)');
  flag('--chaos-specs=<dir>', 'Optional ChaosSpec YAML directory (e.g. chaos-specs/)');
  flag('--min-sla=<percent>', 'Exit 1 when worst SLA falls below threshold (default: 100)');
  flag('--fail-on-recommendations', 'Exit 1 when any recommendation is emitted');
  flag('--max-region-outages=<n>', 'Cap region-outage scenarios per diagram (default: 15)');
  flag('--max-fan-in-probes=<n>', 'Cap fan-in latency probes per diagram (default: 5)');
  flag('--format=text|json|yaml', 'Output format (default: text; CI uses json)');
  flag('--output=<file>', 'Write AdviceLens artifact to a file (.json or .yaml)');

  heading('EXAMPLES');
  example('archlens resilience blueprints/chaoslens-stress/');
  example('archlens resilience --chaos-specs=chaos-specs --min-sla=95');
  example('archlens resilience --format=json --output=.archlens/advicelens-report.json');
  example('archlens resilience --format=yaml --output=advicelens-report.yaml');
  example('archlens resilience --format=json --fail-on-recommendations');
}

export function printPublishHelp(): void {
  heading('archlens publish');
  line(
    `  ${pc.dim('Validate a blueprint tree and plan or upload an immutable remote catalog snapshot (ADR-0010).')}`
  );
  line(`  ${pc.dim('Upload uses @archlens/storage (R2, S3 or Azure Blob adapters).')}`);
  line('');

  heading('USAGE');
  example('archlens publish [path] [options]');

  heading('OPTIONS');
  flag('--path=<dir>', 'Blueprint tree (default: blueprints)');
  flag('--workspace-name=<name>', 'Workspace name for entityRef resolution (default: blueprints)');
  flag(
    '--provider=r2|s3|azure',
    'Object storage provider (default: OBJECT_STORAGE_PROVIDER or r2)'
  );
  flag('--format=text|json', 'Output format (default: text)');
  flag('--bucket=<name>', 'Bucket/container (default: OBJECT_STORAGE_BUCKET / R2_BUCKET env)');
  flag('--account-id=<id>', 'Cloudflare account id for R2 endpoint override');
  flag(
    '--key-prefix=<path>',
    'Object key prefix inside the bucket (or OBJECT_STORAGE_KEY_PREFIX; samples estate: estates/{id}/)'
  );
  flag('--no-dry-run', 'Upload snapshot to object storage');
  flag(
    '--skip-validation',
    'Allow upload without a validation gate (default; use --validate to gate)'
  );
  flag('--validate', 'Fail publish when workspace validation fails');

  heading('EXAMPLES');
  example('archlens publish blueprints/');
  example('archlens publish custom-blueprints/ --format=json');
  example(
    'archlens publish samples/ --workspace-name=samples --key-prefix=estates/samples --no-dry-run'
  );
  example('archlens publish blueprints/ --validate --no-dry-run');
}

export function printCatalogHelp(): void {
  heading('archlens catalog');
  line(
    `  ${pc.dim('Stage estate fragments and compose them into an ADR-0010 latest snapshot (ADR-0014).')}`
  );
  line('');

  heading('USAGE');
  example(
    'archlens catalog publish-fragment [path] --estate=<id> --product=<id> --source-ref=<ref>'
  );
  example('archlens catalog compose --estate=<id>');
  example('archlens catalog accept-overlay --estate=<id> --file=<overlay.yaml>');
  example('archlens catalog reject-overlay --estate=<id> --overlay-id=<id>');
  example('archlens catalog prune --estate=<id>');

  heading('publish-fragment OPTIONS');
  flag('--estate=<id>', 'Estate id (default key prefix estates/{id}/)');
  flag('--product=<id>', 'Product composition key');
  flag('--system=<id>', 'Optional system / path slice within the product');
  flag('--fragment-key=<id>', 'Override fragment key (default: product[--system])');
  flag('--source-ref=<ref>', 'Repo@sha or CI run identity');
  flag('--run-id=<id>', 'Optional run id (default: UTC timestamp)');
  flag('--path=<dir>', 'Blueprint tree (default: blueprints)');
  flag('--key-prefix=<path>', 'Override object key prefix (default: estates/{estate}/)');
  flag('--no-dry-run', 'Upload fragment to object storage');
  flag(
    '--skip-validation',
    'Allow upload without a validation gate (default; use --validate to gate)'
  );
  flag('--validate', 'Fail fragment publish when workspace validation fails');

  heading('compose OPTIONS');
  flag('--estate=<id>', 'Estate id to compose (loads fragments/ under the key prefix)');
  flag('--workspace-name=<name>', 'Workspace name for validation / catalog');
  flag('--key-prefix=<path>', 'Override object key prefix (default: estates/{estate}/)');
  flag('--max-retries=<n>', 'CAS retries on latest/manifest.json (default: 8)');
  flag('--no-dry-run', 'Upload composed snapshot and CAS-update latest');
  flag('--allow-empty', 'Exit 0 when no fragments are staged (cron safety nets)');
  flag(
    '--skip-validation',
    'Allow compose without a validation gate (default; use --validate to gate)'
  );
  flag('--validate', 'Fail compose when the composed tree fails validation');
  flag('--format=text|json', 'Output format (default: text)');

  heading('prune OPTIONS');
  flag('--estate=<id>', 'Estate id (default key prefix estates/{id}/)');
  flag('--key-prefix=<path>', 'Override object key prefix (default: estates/{estate}/)');
  flag('--keep-snapshots=<n>', 'Keep at least N newest snapshots (default: 7)');
  flag('--keep-snapshot-days=<n>', 'Also keep snapshots newer than N days (default: 14)');
  flag('--keep-fragment-runs=<n>', 'Keep N newest runs per fragment key (default: 2)');
  flag('--no-dry-run', 'Delete planned keys (default is dry-run)');
  flag('--format=text|json', 'Output format (default: text)');

  heading('accept-overlay / reject-overlay OPTIONS');
  flag('--estate=<id>', 'Estate id (default key prefix estates/{id}/)');
  flag('--file=<overlay.yaml>', 'accept-overlay: suggestion overlay document to stage');
  flag('--overlay-id=<id>', 'reject-overlay: overlay id to tombstone');
  flag('--key-prefix=<path>', 'Override object key prefix (default: estates/{estate}/)');
  flag('--no-dry-run', 'Write overlay accept/reject to object storage');

  heading('EXAMPLES');
  example(
    'archlens catalog publish-fragment blueprints/ --estate=acme --product=payments --source-ref=repo@abc --no-dry-run'
  );
  example(
    'archlens catalog accept-overlay --estate=acme --file=overlays/add-billing.yaml --no-dry-run'
  );
  example('archlens catalog reject-overlay --estate=acme --overlay-id=add-billing --no-dry-run');
  example('archlens catalog compose --estate=acme');
  example('archlens catalog compose --estate=acme --no-dry-run --format=json');
  example('archlens catalog prune --estate=samples --key-prefix=estates/samples --format=json');
  example(
    'archlens catalog prune --estate=samples --key-prefix=estates/samples --no-dry-run --format=json'
  );
}

export function printUpdateHelp(): void {
  heading('archlens update');
  line(`  ${pc.dim('Download and install the latest release binary, then re-launch.')}`);
  line(`  ${pc.dim('Available only for compiled release builds - skipped in dev/source runs.')}`);
  line('');

  heading('USAGE');
  example('archlens update');

  heading('OPTIONS');
  flag('--no-update-check', 'Skip the interactive startup update prompt on other commands');
}
