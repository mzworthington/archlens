import * as p from '@clack/prompts';
import pc from 'picocolors';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { parseArchlensArgv, parseArchlensCommand } from './parseArchlensArgv.ts';
import { getArchlensVersion, wantsVersionFlag } from './version.ts';
import { isUpdateSubcommand } from './parseArchlensArgv.ts';
import { maybePromptAndSelfUpdate, runUpdateCommand } from './startupUpdate.ts';
import { assertKnownSubcommand, printCliHelp, resolveHelpRequest } from './cliHelp.ts';
import { executeArchitectureRun, resolveArchitectureState } from './architectureRun.ts';
import { executeEnrichRun } from './enrichRun.ts';
import { executeValidateRun } from './validateRun.ts';
import { executeDiffRun } from './diffRun.ts';
import { executeResilienceRun } from './resilienceRun.ts';
import { executePublishRun } from './publishRun.ts';
import { executeComposeCatalogRun } from './composeCatalogRun.ts';
import { executePublishFragmentRun } from './publishFragmentRun.ts';
import { executeAcceptOverlayRun, executeRejectOverlayRun } from './suggestionOverlayRun.ts';
import { resolveWatchOptions, watchAndRerun } from './watchAndRerun.ts';
import type { ArchlensCliPlan } from './parseArchlensArgv.ts';
import {
  promptInteractiveAcceptOverlayPlan,
  promptInteractiveComposePlan,
  promptInteractiveMainAction,
  promptInteractivePublishFragmentPlan,
  promptInteractivePublishPlan,
  promptInteractiveRejectOverlayPlan,
  shouldShowInteractiveMainMenu,
} from './interactiveMainMenu.ts';

function askPathWithTabComplete(message: string, defaultValue: string): Promise<string> {
  return new Promise(resolve => {
    const completer = (line: string) => {
      const lineNormalized = line.replace(/\\/g, '/');
      const lastSlashIdx = lineNormalized.lastIndexOf('/');
      const dirPath = lastSlashIdx !== -1 ? lineNormalized.substring(0, lastSlashIdx) : '.';
      const filePrefix =
        lastSlashIdx !== -1 ? lineNormalized.substring(lastSlashIdx + 1) : lineNormalized;

      try {
        const targetDir = path.resolve(process.cwd(), dirPath);
        if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
          return [[], line];
        }

        const entries = fs.readdirSync(targetDir);
        const hits = entries
          .filter(e => e.startsWith(filePrefix))
          .map(e => {
            const relative = lastSlashIdx !== -1 ? `${dirPath}/${e}` : e;
            const fullPath = path.resolve(targetDir, e);
            return fs.statSync(fullPath).isDirectory() ? `${relative}/` : relative;
          });

        return [hits, line];
      } catch {
        return [[], line];
      }
    };

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer,
    });

    rl.on('SIGINT', () => {
      rl.close();
      console.log();
      p.cancel('Analysis cancelled.');
      process.exit(0);
    });

    const promptText = `${pc.cyan('◇')}  ${message}\n${pc.cyan('│')}  ${pc.dim('Default:')} ${pc.yellow(defaultValue)} ${pc.dim('(Press Tab to autocomplete)')}\n${pc.cyan('└')}  `;
    rl.question(promptText, answer => {
      rl.close();
      const finalVal = answer.trim() || defaultValue;
      console.log(`${pc.cyan('│')}  ${pc.green(finalVal)}`);
      resolve(finalVal);
    });
  });
}

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

  if (isUpdateSubcommand(args)) {
    await runUpdateCommand();
    return;
  }
  if (
    args[0] === 'validate' ||
    args[0] === 'diff' ||
    args[0] === 'resilience' ||
    args[0] === 'publish' ||
    args[0] === 'catalog'
  ) {
    const command = parseArchlensCommand(args);
    if (command.kind === 'validate') {
      await executeValidateRun(command.plan);
      return;
    }
    if (command.kind === 'diff') {
      await executeDiffRun(command.plan);
      return;
    }
    if (command.kind === 'resilience') {
      await executeResilienceRun(command.plan);
      return;
    }
    if (command.kind === 'publish') {
      await executePublishRun(command.plan);
      return;
    }
    if (command.kind === 'catalog-compose') {
      await executeComposeCatalogRun(command.plan);
      return;
    }
    if (command.kind === 'catalog-publish-fragment') {
      await executePublishFragmentRun(command.plan);
      return;
    }
    if (command.kind === 'catalog-accept-overlay') {
      await executeAcceptOverlayRun(command.plan);
      return;
    }
    if (command.kind === 'catalog-reject-overlay') {
      await executeRejectOverlayRun(command.plan);
      return;
    }
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
    const action = await promptInteractiveMainAction();
    switch (action) {
      case 'scan':
        await runArchitecture(plan);
        return;
      case 'publish':
        await executePublishRun(await promptInteractivePublishPlan(askPathWithTabComplete));
        return;
      case 'publish-fragment':
        await executePublishFragmentRun(
          await promptInteractivePublishFragmentPlan(askPathWithTabComplete)
        );
        return;
      case 'compose':
        await executeComposeCatalogRun(await promptInteractiveComposePlan());
        return;
      case 'accept-overlay':
        await executeAcceptOverlayRun(
          await promptInteractiveAcceptOverlayPlan(askPathWithTabComplete)
        );
        return;
      case 'reject-overlay':
        await executeRejectOverlayRun(await promptInteractiveRejectOverlayPlan());
        return;
    }
  }

  await runArchitecture(plan);
}

run();
