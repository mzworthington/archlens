import * as p from '@clack/prompts';
import pc from 'picocolors';
import path from 'node:path';
import { TsMorphParserAdapter } from '../analysis/adapters/parsing/tsMorphParser.ts';
import { TreeSitterParserAdapter } from '../analysis/adapters/parsing/treeSitterParser.ts';
import { NodeFileSystemAdapter } from '../analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import { CodebaseAnalyzer } from '../analysis/domain/analyzer.ts';
import { IacAnalyzer } from '../analysis/domain/iacAnalyzer.ts';
import {
  loadAnalysisConfig,
  mergeAnalysisOptions,
  type LoadedAnalysisConfig,
} from '../analysis/adapters/loadAnalysisConfig.ts';
import {
  createCliCancellation,
  isCancellationError,
  type CliCancellation,
} from '../analysis/domain/cancellation.ts';
import { collectFileMetrics } from '../forensics/collectFileMetrics.ts';
import { TreeSitterScanCache } from '../analysis/adapters/parsing/treeSitterForensics.ts';
import { collectGitProvenance } from '../analysis/adapters/gitProvenance.ts';
import {
  applyInteractiveGitChoice,
  shouldPromptForGit,
  type InteractiveGitChoice,
} from './interactiveGitChoice.ts';
import { DEFAULT_FORENSICS_OPTIONS } from '../forensics/domain/options.ts';
import { DEFAULT_SCAN_GLOB } from '../analysis/domain/analysisOptions.ts';
import type { FileMetrics } from '../forensics/domain/types.ts';
import type { ArchlensCliPlan } from './parseArchlensArgv.ts';
import {
  formatAnalysisSpinnerMessage,
  formatSuccessOutro,
  renderCliBanner,
  renderCliIntroNote,
} from './cliBanner.ts';
import { getArchlensVersion } from './version.ts';

const DEFAULT_CONTEXT_NAME = 'blueprint';

export interface ResolvedArchitectureState {
  plan: ArchlensCliPlan;
  parserType: string;
  globPattern: string;
  outputDir: string;
  contextName: string;
  rollupModules: boolean;
  cliIgnores: string[];
  cliSystems: string[] | undefined;
  fileConfig: LoadedAnalysisConfig;
}

export interface ExecuteArchitectureOptions {
  headlessUi: boolean;
  watchMode?: boolean;
  cancellation?: CliCancellation;
  suppressExitOnCancel?: boolean;
  promptInteractiveGit?: (plan: ArchlensCliPlan) => Promise<InteractiveGitChoice>;
  askPath?: (message: string, defaultValue: string) => Promise<string>;
}

async function defaultPromptInteractiveGit(): Promise<InteractiveGitChoice> {
  const enableForensics = await p.confirm({
    message: 'Attach TraceLens git signals (churn, complexity, ownership)?',
    initialValue: true,
  });

  if (p.isCancel(enableForensics)) {
    p.cancel('Analysis cancelled.');
    process.exit(0);
  }

  if (!enableForensics) {
    return { mode: 'none' };
  }

  const sinceInput = await p.text({
    message: 'Git lookback window (days):',
    placeholder: String(DEFAULT_FORENSICS_OPTIONS.sinceDays),
    defaultValue: String(DEFAULT_FORENSICS_OPTIONS.sinceDays),
  });

  if (p.isCancel(sinceInput)) {
    p.cancel('Analysis cancelled.');
    process.exit(0);
  }

  const parsed = Number(String(sinceInput).replace(/d$/i, '').trim());
  const sinceDays =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FORENSICS_OPTIONS.sinceDays;

  return { mode: 'full', sinceDays };
}

export async function resolveArchitectureState(
  plan: ArchlensCliPlan,
  options: {
    interactive: boolean;
    promptInteractiveGit?: ExecuteArchitectureOptions['promptInteractiveGit'];
    askPath?: ExecuteArchitectureOptions['askPath'];
  }
): Promise<ResolvedArchitectureState> {
  const fileConfig = loadAnalysisConfig(process.cwd());
  let resolvedPlan = plan;

  let parserType = plan.architecture.parserType || 'tree-sitter';
  let globPattern = plan.architecture.glob || fileConfig.glob || DEFAULT_SCAN_GLOB;
  let outputDir = plan.architecture.outputDir || process.env.ARCHLENS_OUTPUT_DIR || 'blueprints';
  let contextName = plan.architecture.context || fileConfig.context || DEFAULT_CONTEXT_NAME;
  let rollupModules = plan.architecture.rollupModules || fileConfig.rollupModules;
  const cliIgnores = plan.architecture.ignore;
  const cliSystems = plan.architecture.systems;

  if (options.interactive) {
    renderCliBanner(getArchlensVersion());
    renderCliIntroNote(fileConfig.configPath);

    const contextNameInput = await p.text({
      message: 'Blueprint root name (entityRef):',
      placeholder: contextName,
      defaultValue: contextName,
    });

    if (p.isCancel(contextNameInput)) {
      p.cancel('Analysis cancelled.');
      process.exit(0);
    }
    contextName = (contextNameInput as string) || contextName;

    const confirmRollup = await p.confirm({
      message: 'Roll up *-module-* packages into their parent systems?',
      initialValue: rollupModules,
    });

    if (p.isCancel(confirmRollup)) {
      p.cancel('Analysis cancelled.');
      process.exit(0);
    }
    rollupModules = confirmRollup;

    const askPath = options.askPath;
    if (!askPath) {
      throw new Error('askPath is required for interactive resolution');
    }

    globPattern = await askPath('Source glob to scan:', globPattern);
    outputDir = await askPath('Output directory for blueprints:', outputDir);

    if (shouldPromptForGit(resolvedPlan)) {
      const promptGit = options.promptInteractiveGit ?? defaultPromptInteractiveGit;
      resolvedPlan = applyInteractiveGitChoice(resolvedPlan, await promptGit(resolvedPlan));
    }
  }

  return {
    plan: resolvedPlan,
    parserType,
    globPattern,
    outputDir,
    contextName,
    rollupModules,
    cliIgnores,
    cliSystems,
    fileConfig,
  };
}

export async function executeArchitectureRun(
  state: ResolvedArchitectureState,
  options: ExecuteArchitectureOptions
): Promise<void> {
  const {
    headlessUi,
    watchMode = false,
    cancellation: externalCancellation,
    suppressExitOnCancel = false,
  } = options;

  const scanCache = state.plan.runGitForensics ? new TreeSitterScanCache() : undefined;

  let forensicsByPath: Map<string, FileMetrics> | undefined;
  if (state.plan.runGitForensics) {
    const logger = new ConsoleLogger();
    try {
      if (!headlessUi) {
        p.log.step('Collecting TraceLens metrics…');
      }
      forensicsByPath = await collectFileMetrics(state.plan.git, process.cwd(), undefined, {
        scanCache,
      });
    } catch (error) {
      logger.error('Failed to collect Git forensics', error);
      if (!suppressExitOnCancel) process.exit(1);
      throw error;
    }
  }

  const sourceProvenance = await collectGitProvenance(process.cwd());
  const analysisOptions = mergeAnalysisOptions(state.fileConfig, {
    ignore: state.cliIgnores,
    include: state.fileConfig.include,
    systems: state.cliSystems,
    rollupModules: state.rollupModules,
  });

  const parser =
    state.parserType === 'ts-morph'
      ? new TsMorphParserAdapter(analysisOptions)
      : new TreeSitterParserAdapter(analysisOptions, scanCache);
  const fileSystem = new NodeFileSystemAdapter();
  const logger = new ConsoleLogger();
  const analyzer = new CodebaseAnalyzer({
    parser,
    fileSystem,
    logger,
    analysisOptions,
  });

  const spinner = headlessUi ? null : p.spinner();
  const cancellation = externalCancellation ?? createCliCancellation();
  const disposeCancellation = externalCancellation ? () => undefined : cancellation.install();

  try {
    if (spinner) {
      spinner.start(
        `${formatAnalysisSpinnerMessage(Boolean(forensicsByPath))} ${pc.dim('(Ctrl+C to cancel)')}`
      );
    }

    const absoluteOutputDir = path.resolve(process.cwd(), state.outputDir);
    const discoveredSystems = await analyzer.runAnalysis(
      state.contextName,
      state.outputDir,
      state.globPattern,
      cancellation.signal,
      {
        forensicsByPath,
        source: sourceProvenance,
      }
    );

    const iacAnalyzer = new IacAnalyzer({ fileSystem, logger, parser });
    const iacResult = await iacAnalyzer.run(state.contextName, state.outputDir, {
      scanRoot: process.cwd(),
      signal: cancellation.signal,
      source: sourceProvenance,
      discoveredSystems,
    });

    if (iacResult.rootsAnalyzed > 0 && !headlessUi) {
      const parts = [];
      if (iacResult.terraformRoots > 0) parts.push(`${iacResult.terraformRoots} Terraform`);
      if (iacResult.pulumiRoots > 0) parts.push(`${iacResult.pulumiRoots} Pulumi`);
      p.log.info(
        `IaC: wrote ${iacResult.rootsAnalyzed} infrastructure diagram(s) (${parts.join(', ')})`
      );
    }

    const successMessage = formatSuccessOutro(absoluteOutputDir);
    if (watchMode) {
      console.log(pc.green(successMessage));
    } else if (spinner) {
      spinner.stop(successMessage);
    } else if (!headlessUi) {
      p.outro(successMessage);
    } else {
      console.log(pc.green(successMessage));
    }
  } catch (error) {
    if (isCancellationError(error)) {
      if (suppressExitOnCancel) {
        throw error;
      }
      if (spinner) spinner.stop(pc.yellow('Analysis cancelled'));
      else console.log(pc.yellow('\nAnalysis cancelled.'));
      if (!headlessUi) p.cancel('Analysis cancelled.');
      process.exit(130);
    }

    if (spinner) spinner.stop(pc.red('Failed to complete analysis'));
    logger.error('Failed to run AST analysis', error);
    if (!suppressExitOnCancel) process.exit(1);
    throw error;
  } finally {
    disposeCancellation();
  }
}
