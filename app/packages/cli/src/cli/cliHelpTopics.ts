import pc from 'picocolors';
import { catalogHelpLines, HELP_SECTION, type HelpTopic } from './cliFlagCatalog.ts';

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

function printCatalogFlags(topic: HelpTopic, section: string): void {
  heading(section);
  for (const entry of catalogHelpLines(topic, section)) {
    flag(entry.helpName, entry.summary);
  }
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

  printCatalogFlags('overview', HELP_SECTION.common);

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

  printCatalogFlags('scan', HELP_SECTION.options);

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

  printCatalogFlags('enrich', HELP_SECTION.options);

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

  printCatalogFlags('validate', HELP_SECTION.options);

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

  printCatalogFlags('diff', HELP_SECTION.options);

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

  printCatalogFlags('resilience', HELP_SECTION.options);

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

  printCatalogFlags('publish', HELP_SECTION.options);

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

  printCatalogFlags('catalog', HELP_SECTION.fragment);
  printCatalogFlags('catalog', HELP_SECTION.compose);
  printCatalogFlags('catalog', HELP_SECTION.prune);
  printCatalogFlags('catalog', HELP_SECTION.overlay);

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

  printCatalogFlags('update', HELP_SECTION.options);
}
