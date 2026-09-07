import { parseArchlensArgv, isUpdateSubcommand } from './parseArchlensArgv';
import { getArchlensVersion, wantsVersionFlag } from './version';
import { maybePromptAndSelfUpdate, runUpdateCommand } from './startupUpdate';
import { assertKnownFlags } from './help/flagCatalog';
import { assertKnownSubcommand, printCliHelp, resolveHelpRequest } from './help/index';
import { executeArchitectureRun, resolveArchitectureState } from './architectureRun';
import { executeEnrichRun } from './enrichRun';
import { executePublishRun } from './publish/publishRun';
import { resolveWatchOptions, watchAndRerun } from './watch/watchAndRerun';
import type { ArchlensCliPlan } from './parseArchlensArgv';
import { shouldShowInteractiveMainMenu } from './interactive/interactiveMainMenu';
import { askPathWithTabComplete } from './askPathWithTabComplete';
import { dispatchCliCommand } from './dispatchCliCommand';
import { runInteractiveMainMenu } from './runInteractiveMainMenu';

async function runArchitecture(plan: ArchlensCliPlan): Promise<void> {
  const state = await resolveArchitectureState(plan, {
    interactive: !plan.isHeadless,
    askPath: askPathWithTabComplete,
  });
  await executeArchitectureRun(state, { headlessUi: plan.isHeadless });

  if (plan.publishAfterScan) {
    await executePublishRun({
      targetPath: state.outputDir,
      format: 'json',
      dryRun: false,
      skipValidation: plan.publishSkipValidation,
      keyPrefix: plan.publishKeyPrefix,
      workspaceName: plan.publishWorkspaceName,
    });
  }
}

async function run() {
  const args = process.argv.slice(2);

  const help = resolveHelpRequest(args);
  if (help.isHelp) {
    printCliHelp(help.topic);
    process.exit(0);
  }

  if (wantsVersionFlag(args)) {
    console.log(getArchlensVersion());
    process.exit(0);
  }

  assertKnownSubcommand(args);
  assertKnownFlags(args);

  if (isUpdateSubcommand(args)) {
    await runUpdateCommand();
    return;
  }

  if (await dispatchCliCommand(args)) {
    return;
  }

  await maybePromptAndSelfUpdate(args);
  const plan = parseArchlensArgv(args);

  if (plan.runEnrichOnly) {
    await executeEnrichRun(plan);
    return;
  }

  if (plan.watch) {
    if (plan.publishAfterScan) {
      console.warn('Ignoring --publish with --watch (publish only runs on one-shot scans).');
    }
    await watchAndRerun(plan, resolveWatchOptions(plan), {
      resolveState: async (watchPlan, opts) =>
        resolveArchitectureState(watchPlan, {
          ...opts,
          askPath: askPathWithTabComplete,
        }),
    });
    return;
  }

  if (shouldShowInteractiveMainMenu(plan)) {
    const handled = await runInteractiveMainMenu(plan, askPathWithTabComplete, runArchitecture);
    if (handled) return;
  }

  await runArchitecture(plan);
}

run();
