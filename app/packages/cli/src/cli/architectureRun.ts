import * as p from '@clack/prompts';
import pc from 'picocolors';
import path from 'node:path';
import { TsMorphParserAdapter } from '../analysis/adapters/parsing/tsMorphParser.ts';
import { TreeSitterParserAdapter } from '../analysis/adapters/parsing/treeSitterParser.ts';
import { NodeFileSystemAdapter } from '../analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import {
  CodebaseAnalyzer,
  IacAnalyzer,
  isCancellationError,
  DEFAULT_SCAN_GLOB,
} from '@archlens/analysis';
import {
  loadAnalysisConfig,
  mergeAnalysisOptions,
  type LoadedAnalysisConfig,
} from '../analysis/adapters/loadAnalysisConfig.ts';
import {
  createCliCancellation,
  type CliCancellation,
} from '../analysis/adapters/cliCancellation.ts';
import { collectFileMetrics } from '../forensics/collectFileMetrics.ts';
import { TreeSitterScanCache } from '../analysis/adapters/parsing/treeSitterForensics.ts';
import { collectGitProvenance } from '../analysis/adapters/gitProvenance.ts';
import type { InteractiveGitChoice } from './interactiveGitChoice.ts';
import type { FileMetrics } from '../forensics/domain/types.ts';
import type { ArchlensCliPlan } from './parseArchlensArgv.ts';
import { formatAnalysisSpinnerMessage, formatSuccessOutro } from './cliBanner.ts';
import {
  defaultPromptInteractiveGit,
  promptArchitectureInteractive,
} from './promptArchitectureInteractive.ts';

const DEFAULT_CONTEXT_NAME = 'blueprint';

export interface ResolvedArchitectureState {
  plan: ArchlensCliPlan;
  parserType: string;
  globPattern: string;
  outputDir: string;
  contextName: string;
  systemName: string | undefined;
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

export async function resolveArchitectureState(
  plan: ArchlensCliPlan,
  options: {
    interactive: boolean;
    promptInteractiveGit?: ExecuteArchitectureOptions['promptInteractiveGit'];
    askPath?: ExecuteArchitectureOptions['askPath'];
  }
): Promise<ResolvedArchitectureState> {
  const fileConfig = loadAnalysisConfig(process.cwd());

  let parserType = plan.architecture.parserType || 'tree-sitter';
  let globPattern = plan.architecture.glob || fileConfig.glob || DEFAULT_SCAN_GLOB;
  let outputDir = plan.architecture.outputDir || process.env.ARCHLENS_OUTPUT_DIR || 'blueprints';
  let contextName = plan.architecture.context || fileConfig.context || DEFAULT_CONTEXT_NAME;
  let systemName = plan.architecture.systemName || fileConfig.systemName;
  let rollupModules = plan.architecture.rollupModules || fileConfig.rollupModules;
  let resolvedPlan = plan;

  if (options.interactive) {
    const interactive = await promptArchitectureInteractive({
      plan,
      fileConfig,
      contextName,
      systemName,
      rollupModules,
      globPattern,
      outputDir,
      askPath: options.askPath,
      promptInteractiveGit: options.promptInteractiveGit,
    });
    resolvedPlan = interactive.plan;
    contextName = interactive.contextName;
    systemName = interactive.systemName;
    rollupModules = interactive.rollupModules;
    globPattern = interactive.globPattern;
    outputDir = interactive.outputDir;
  }

  return {
    plan: resolvedPlan,
    parserType,
    globPattern,
    outputDir,
    contextName,
    systemName,
    rollupModules,
    cliIgnores: plan.architecture.ignore,
    cliSystems: plan.architecture.systems,
    fileConfig,
  };
}

async function collectOptionalForensics(
  state: ResolvedArchitectureState,
  headlessUi: boolean,
  suppressExitOnCancel: boolean,
  scanCache: TreeSitterScanCache | undefined
): Promise<Map<string, FileMetrics> | undefined> {
  if (!state.plan.runGitForensics) return undefined;

  const logger = new ConsoleLogger();
  try {
    if (!headlessUi) {
      p.log.step('Collecting TraceLens metrics…');
    }
    return await collectFileMetrics(state.plan.git, process.cwd(), undefined, { scanCache });
  } catch (error) {
    logger.error('Failed to collect Git forensics', error);
    if (!suppressExitOnCancel) process.exit(1);
    throw error;
  }
}

function reportIacResult(
  iacResult: Awaited<ReturnType<IacAnalyzer['run']>>,
  headlessUi: boolean
): void {
  if (iacResult.rootsAnalyzed <= 0 || headlessUi) return;
  const parts = [];
  if (iacResult.terraformRoots > 0) parts.push(`${iacResult.terraformRoots} Terraform`);
  if (iacResult.pulumiRoots > 0) parts.push(`${iacResult.pulumiRoots} Pulumi`);
  p.log.info(
    `IaC: wrote ${iacResult.rootsAnalyzed} infrastructure diagram(s) (${parts.join(', ')})`
  );
}

function finishArchitectureSuccess(
  successMessage: string,
  {
    headlessUi,
    watchMode,
    spinner,
  }: {
    headlessUi: boolean;
    watchMode: boolean;
    spinner: ReturnType<typeof p.spinner> | null;
  }
): void {
  if (watchMode) {
    console.log(pc.green(successMessage));
    return;
  }
  if (spinner) {
    spinner.stop(successMessage);
    return;
  }
  if (!headlessUi) {
    p.outro(successMessage);
    return;
  }
  console.log(pc.green(successMessage));
}

function handleArchitectureError(
  error: unknown,
  {
    headlessUi,
    suppressExitOnCancel,
    spinner,
    logger,
  }: {
    headlessUi: boolean;
    suppressExitOnCancel: boolean;
    spinner: ReturnType<typeof p.spinner> | null;
    logger: ConsoleLogger;
  }
): never {
  if (isCancellationError(error)) {
    if (suppressExitOnCancel) throw error;
    if (spinner) spinner.stop(pc.yellow('Analysis cancelled'));
    else console.log(pc.yellow('\nAnalysis cancelled.'));
    if (!headlessUi) p.cancel('Analysis cancelled.');
    process.exit(130);
  }

  if (spinner) spinner.stop(pc.red('Failed to complete analysis'));
  logger.error('Failed to run AST analysis', error);
  if (!suppressExitOnCancel) process.exit(1);
  throw error;
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
  const forensicsByPath = await collectOptionalForensics(
    state,
    headlessUi,
    suppressExitOnCancel,
    scanCache
  );

  const sourceProvenance = await collectGitProvenance(process.cwd());
  const scanSource =
    sourceProvenance || state.systemName
      ? {
          ...sourceProvenance,
          ...(state.systemName ? { systemName: state.systemName } : {}),
        }
      : undefined;
  const analysisOptions = mergeAnalysisOptions(state.fileConfig, {
    ignore: state.cliIgnores,
    include: state.fileConfig.include,
    systems: state.cliSystems,
    systemName: state.systemName,
    rollupModules: state.rollupModules,
  });

  // tree-sitter is the default/CI path (multi-language WASM). ts-morph stays behind
  // --parser=ts-morph for TypeScript-only scans that prefer the tsconfig-aware Project API.
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
        source: scanSource,
      }
    );

    const iacAnalyzer = new IacAnalyzer({ fileSystem, logger, parser });
    const iacResult = await iacAnalyzer.run(state.contextName, state.outputDir, {
      scanRoot: process.cwd(),
      signal: cancellation.signal,
      source: scanSource,
      discoveredSystems,
    });
    reportIacResult(iacResult, headlessUi);

    finishArchitectureSuccess(formatSuccessOutro(absoluteOutputDir), {
      headlessUi,
      watchMode,
      spinner,
    });
  } catch (error) {
    handleArchitectureError(error, {
      headlessUi,
      suppressExitOnCancel,
      spinner,
      logger,
    });
  } finally {
    disposeCancellation();
  }
}

export { defaultPromptInteractiveGit };
