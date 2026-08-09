import * as p from '@clack/prompts';
import {
  applyInteractiveGitChoice,
  shouldPromptForGit,
  type InteractiveGitChoice,
} from './interactiveGitChoice.ts';
import { DEFAULT_FORENSICS_OPTIONS } from '../forensics/domain/options.ts';
import type { ArchlensCliPlan } from './parseArchlensArgv.ts';
import { renderCliBanner, renderCliIntroNote, renderCliQuickTips } from './cliBanner.ts';
import { getArchlensVersion } from './version.ts';
import type { LoadedAnalysisConfig } from '../analysis/adapters/loadAnalysisConfig.ts';

function exitOnCancel(value: unknown): asserts value is string | boolean {
  if (p.isCancel(value)) {
    p.cancel('Analysis cancelled.');
    process.exit(0);
  }
}

async function defaultPromptInteractiveGit(): Promise<InteractiveGitChoice> {
  const enableForensics = await p.confirm({
    message: 'Attach TraceLens git signals (churn, complexity, ownership)?',
    initialValue: true,
  });
  exitOnCancel(enableForensics);

  if (!enableForensics) {
    return { mode: 'none' };
  }

  const sinceInput = await p.text({
    message: 'Git lookback window (days):',
    placeholder: String(DEFAULT_FORENSICS_OPTIONS.sinceDays),
    defaultValue: String(DEFAULT_FORENSICS_OPTIONS.sinceDays),
  });
  exitOnCancel(sinceInput);

  const parsed = Number(String(sinceInput).replace(/d$/i, '').trim());
  const sinceDays =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FORENSICS_OPTIONS.sinceDays;

  return { mode: 'full', sinceDays };
}

export type InteractiveArchitectureConfig = {
  plan: ArchlensCliPlan;
  contextName: string;
  systemName: string | undefined;
  rollupModules: boolean;
  globPattern: string;
  outputDir: string;
};

export async function promptArchitectureInteractive(input: {
  plan: ArchlensCliPlan;
  fileConfig: LoadedAnalysisConfig;
  contextName: string;
  systemName: string | undefined;
  rollupModules: boolean;
  globPattern: string;
  outputDir: string;
  askPath?: (message: string, defaultValue: string) => Promise<string>;
  promptInteractiveGit?: (plan: ArchlensCliPlan) => Promise<InteractiveGitChoice>;
}): Promise<InteractiveArchitectureConfig> {
  renderCliBanner(getArchlensVersion());
  renderCliIntroNote(input.fileConfig.configPath);
  renderCliQuickTips();

  const contextNameInput = await p.text({
    message: 'Blueprint root name (entityRef):',
    placeholder: input.contextName,
    defaultValue: input.contextName,
  });
  exitOnCancel(contextNameInput);
  const contextName = (contextNameInput as string) || input.contextName;

  const systemNameInput = await p.text({
    message: 'Software system name (optional - one product across multiple repos):',
    placeholder: 'e.g. frontend-api',
    defaultValue: input.systemName ?? '',
  });
  exitOnCancel(systemNameInput);
  const trimmedSystemName = String(systemNameInput).trim();
  const systemName = trimmedSystemName || undefined;

  const confirmRollup = await p.confirm({
    message: 'Roll up *-module-* packages into their parent systems?',
    initialValue: input.rollupModules,
  });
  exitOnCancel(confirmRollup);

  if (!input.askPath) {
    throw new Error('askPath is required for interactive resolution');
  }

  const globPattern = await input.askPath('Source glob to scan:', input.globPattern);
  const outputDir = await input.askPath('Output directory for blueprints:', input.outputDir);

  let plan = input.plan;
  if (shouldPromptForGit(plan)) {
    const promptGit = input.promptInteractiveGit ?? defaultPromptInteractiveGit;
    plan = applyInteractiveGitChoice(plan, await promptGit(plan));
  }

  return {
    plan,
    contextName,
    systemName,
    rollupModules: confirmRollup,
    globPattern,
    outputDir,
  };
}
