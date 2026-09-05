import { parseArchlensArgv, isUpdateSubcommand } from './parseArchlensArgv.ts';
import { getArchlensVersion, wantsVersionFlag } from './version.ts';
import { maybePromptAndSelfUpdate, runUpdateCommand } from './startupUpdate.ts';
import { assertKnownFlags } from './help/flagCatalog.ts';
import { assertKnownSubcommand, printCliHelp, resolveHelpRequest } from './help/index.ts';
import { executeArchitectureRun, resolveArchitectureState } from './architectureRun.ts';
import { executeEnrichRun } from './enrichRun.ts';
import { executePublishRun } from './publishRun.ts';
import { resolveWatchOptions, watchAndRerun } from './watchAndRerun.ts';
import type { ArchlensCliPlan } from './parseArchlensArgv.ts';
import { shouldShowInteractiveMainMenu } from './interactiveMainMenu.ts';
import { askPathWithTabComplete } from './askPathWithTabComplete.ts';
import { dispatchCliCommand } from './dispatchCliCommand.ts';
import { runInteractiveMainMenu } from './runInteractiveMainMenu.ts';

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
