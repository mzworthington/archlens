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
import { resolveWatchOptions, watchAndRerun } from './watchAndRerun.ts';
import type { ArchlensCliPlan } from './parseArchlensArgv.ts';

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
  if (args[0] === 'validate' || args[0] === 'diff') {
    const command = parseArchlensCommand(args);
    if (command.kind === 'validate') {
      await executeValidateRun(command.plan);
      return;
    }
    if (command.kind === 'diff') {
      await executeDiffRun(command.plan);
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
    await watchAndRerun(plan, resolveWatchOptions(plan), {
      resolveState: async (watchPlan, opts) =>
        resolveArchitectureState(watchPlan, {
          ...opts,
          askPath: askPathWithTabComplete,
        }),
    });
    return;
  }

  await runArchitecture(plan);
}

run();
