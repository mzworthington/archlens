import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import { aggregateFileHistory } from './aggregateHistory.ts';
import { classifyFile } from './classify.ts';
import { computeHotspotScores } from './hotspotScoring.ts';
import { buildImportCoupling } from '@archlens/core/forensics';
import {
  DEFAULT_FORENSICS_OPTIONS,
  mergeForensicsOptions,
  type ForensicsOptions,
} from './options.ts';
import { resolveEffectiveMinChurnForComplexity } from './forensicsGlob.ts';
import type { ForensicAnalyzerPorts } from './ports.ts';
import { computeTemporalCoupling } from './temporalCoupling.ts';
import type { CoupledFileRef, FileMetrics, ForensicReport, StructuralMetrics } from './types.ts';

export interface RunForensicsInput {
  rootPath: string;
  options?: Partial<ForensicsOptions>;
  explicitPaths?: string[];
  hotspotsOnly?: boolean;
  signal?: AbortSignal;
  now?: () => Date;
}

export class ForensicAnalyzer {
  constructor(private readonly ports: ForensicAnalyzerPorts) {}

  async run(input: RunForensicsInput): Promise<ForensicReport> {
    const options = mergeForensicsOptions(DEFAULT_FORENSICS_OPTIONS, input.options);
    const signal = input.signal;
    const referenceDate = (input.now ?? (() => new Date()))();
    throwIfAborted(signal);

    const paths =
      input.explicitPaths ?? (await this.ports.fileLister.listSourceFiles(options, signal));
    throwIfAborted(signal);

    const pathSet = new Set(paths);
    const effectiveMinChurn = resolveEffectiveMinChurnForComplexity(
      options.minChurnForComplexity,
      paths.length
    );

    const commits = await this.ports.gitHistory.loadHistory(
      input.rootPath,
      { sinceDays: options.sinceDays },
      signal
    );
    throwIfAborted(signal);

    const historyLong = aggregateFileHistory(commits, paths, {
      sinceDays: options.sinceDays,
      referenceDate,
    });
    const historyByPath = new Map(historyLong.map(h => [h.path, h]));

    const dualChurnEnabled =
      options.shortChurnDays > 0 && options.shortChurnDays < options.sinceDays;
    const historyShort = dualChurnEnabled
      ? aggregateFileHistory(commits, paths, {
          windowDays: options.shortChurnDays,
          referenceDate,
        })
      : null;
    const shortHistoryByPath = historyShort ? new Map(historyShort.map(h => [h.path, h])) : null;

    const pathsForComplexity =
      effectiveMinChurn > 0
        ? paths.filter(p => (historyByPath.get(p)?.churn ?? 0) >= effectiveMinChurn)
        : paths;

    const structural = await this.ports.complexity.analyze(pathsForComplexity, options, signal);
    throwIfAborted(signal);
    const structuralByPath = new Map(structural.map(s => [s.path, s]));

    const importSpecifiers = await this.ports.importGraph.extractImports(paths, options, signal);
    throwIfAborted(signal);
    const importCouplingByPath = buildImportCoupling(importSpecifiers, pathSet);

    const coupledPairs = computeTemporalCoupling(
      commits,
      {
        minSharedCommits: options.minSharedCommits,
        couplingThreshold: options.couplingThreshold,
        maxFilesPerCommitForCoupling: options.maxFilesPerCommitForCoupling,
      },
      pathSet
    );

    const couplingByPath = new Map<string, CoupledFileRef[]>();
    for (const pair of coupledPairs) {
      const forA = couplingByPath.get(pair.a) ?? [];
      forA.push({ path: pair.b, score: pair.score, sharedCommits: pair.sharedCommits });
      couplingByPath.set(pair.a, forA);

      const forB = couplingByPath.get(pair.b) ?? [];
      forB.push({ path: pair.a, score: pair.score, sharedCommits: pair.sharedCommits });
      couplingByPath.set(pair.b, forB);
    }

    const emptyStructural: StructuralMetrics = {
      path: '',
      complexity: 0,
      loc: 0,
      sloc: 0,
    };

    const scoreInputs = paths.map(path => {
      const s = structuralByPath.get(path) ?? { ...emptyStructural, path };
      const h = historyByPath.get(path)!;
      return {
        path,
        complexity: s.complexity,
        churn: h.churn,
        lineChurn: h.lineChurn,
      };
    });
    const hotspotScores = computeHotspotScores(scoreInputs);

    let files: FileMetrics[] = paths.map(path => {
      const s = structuralByPath.get(path) ?? { ...emptyStructural, path };
      const h = historyByPath.get(path)!;
      const hotspotScore = hotspotScores.get(path) ?? 0;
      const classifications = classifyFile({
        hotspotScore,
        complexity: s.complexity,
        authorCount: h.authorCount,
        topAuthorPercent: h.topAuthorPercent,
        hotspotThreshold: options.hotspotThreshold,
        complexityThreshold: options.complexityThreshold,
        siloTopAuthorPercent: options.siloTopAuthorPercent,
      });

      const churn365 = h.churn;
      const churn30 = shortHistoryByPath?.get(path)?.churn;
      const importedFiles = importCouplingByPath.get(path);

      return {
        path,
        complexity: s.complexity,
        ...(s.complexityPeak !== undefined ? { complexityPeak: s.complexityPeak } : {}),
        ...(s.cognitiveComplexity !== undefined
          ? { cognitiveComplexity: s.cognitiveComplexity }
          : {}),
        ...(s.functionCount !== undefined ? { functionCount: s.functionCount } : {}),
        loc: s.loc,
        sloc: s.sloc,
        churn: churn365,
        ...(h.lineChurn !== undefined ? { lineChurn: h.lineChurn } : {}),
        ...(dualChurnEnabled
          ? {
              churn30,
              churn365,
            }
          : {}),
        churnByWeek: h.churnByWeek,
        authorCount: h.authorCount,
        topAuthorPercent: h.topAuthorPercent,
        authors: h.authors,
        coupledFiles: couplingByPath.get(path) ?? [],
        ...(importedFiles && importedFiles.length > 0 ? { importedFiles } : {}),
        hotspotScore,
        classifications,
      };
    });

    if (input.hotspotsOnly) {
      files = files.filter(f => f.classifications.includes('hotspot'));
    }

    files.sort((a, b) => b.hotspotScore - a.hotspotScore || a.path.localeCompare(b.path));

    const report: ForensicReport = {
      generatedAt: referenceDate.toISOString(),
      rootPath: input.rootPath,
      options,
      files,
      coupledPairs,
    };

    for (const reporter of this.ports.reporters) {
      throwIfAborted(signal);
      await reporter.report(report, signal);
    }

    return report;
  }
}
