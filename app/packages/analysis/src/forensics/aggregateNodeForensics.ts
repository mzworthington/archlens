import type { NodeForensics, SystemNode } from '@archlens/core';
import {
  rollupChurnByWeek,
  rollupForensicAuthors,
  rollupMaxByWeek,
  rollupTopCoupledFiles,
} from '@archlens/core/forensics';
import type { FileMetrics } from './types';

function pickDefinedNumber<K extends string>(
  key: K,
  value: number | undefined
): Partial<Record<K, number>> {
  return value !== undefined ? ({ [key]: value } as Record<K, number>) : {};
}

function pickPositiveNumber<K extends string>(key: K, value: number): Partial<Record<K, number>> {
  return value > 0 ? ({ [key]: value } as Record<K, number>) : {};
}

function pickFlaggedNumber<K extends string>(
  key: K,
  enabled: boolean,
  value: number
): Partial<Record<K, number>> {
  return enabled ? ({ [key]: value } as Record<K, number>) : {};
}

export function fileMetricsToNodeForensics(metrics: FileMetrics): NodeForensics {
  const importedFiles =
    metrics.importedFiles && metrics.importedFiles.length > 0
      ? metrics.importedFiles.map(i => ({ path: i.path, kind: i.kind }))
      : undefined;

  return {
    complexity: metrics.complexity,
    ...pickDefinedNumber('complexityPeak', metrics.complexityPeak),
    ...pickDefinedNumber('cognitiveComplexity', metrics.cognitiveComplexity),
    ...pickDefinedNumber('functionCount', metrics.functionCount),
    loc: metrics.loc,
    sloc: metrics.sloc,
    churn: metrics.churn,
    ...pickDefinedNumber('lineChurn', metrics.lineChurn),
    ...pickDefinedNumber('churn30', metrics.churn30),
    ...pickDefinedNumber('churn365', metrics.churn365),
    churnByWeek: metrics.churnByWeek,
    ...(metrics.hotspotScoreByWeek && metrics.hotspotScoreByWeek.length > 0
      ? { hotspotScoreByWeek: metrics.hotspotScoreByWeek }
      : {}),
    authorCount: metrics.authorCount,
    topAuthorPercent: metrics.topAuthorPercent,
    ...(metrics.authors && metrics.authors.length > 0 ? { authors: metrics.authors } : {}),
    hotspotScore: metrics.hotspotScore,
    classifications: [...metrics.classifications],
    coupledFiles: metrics.coupledFiles.map(c => ({
      path: c.path,
      score: c.score,
      sharedCommits: c.sharedCommits,
    })),
    ...(importedFiles ? { importedFiles } : {}),
    ...pickDefinedNumber('sinceDays', metrics.sinceDays),
    ...pickDefinedNumber('shortChurnDays', metrics.shortChurnDays),
  };
}

interface ForensicAccumulator {
  complexity: number;
  complexityPeak: number;
  cognitiveComplexity: number;
  loc: number;
  sloc: number;
  hasLoc: boolean;
  hasSloc: boolean;
  churn: number;
  lineChurn: number;
  hasLineChurn: boolean;
  churn30: number;
  churn365: number;
  hasChurn30: boolean;
  hasChurn365: boolean;
  hotspotScore: number;
  authorCount: number;
  hotspotCount: number;
  knowledgeSiloCount: number;
  sinceDays: number | undefined;
  shortChurnDays: number | undefined;
  ownershipWeight: number;
  weightedOwnership: number;
  classificationSet: Set<'hotspot' | 'knowledge-silo'>;
  churnByWeekSeries: (number[] | undefined)[];
  hotspotScoreByWeekSeries: (number[] | undefined)[];
}

function createAccumulator(): ForensicAccumulator {
  return {
    complexity: 0,
    complexityPeak: 0,
    cognitiveComplexity: 0,
    loc: 0,
    sloc: 0,
    hasLoc: false,
    hasSloc: false,
    churn: 0,
    lineChurn: 0,
    hasLineChurn: false,
    churn30: 0,
    churn365: 0,
    hasChurn30: false,
    hasChurn365: false,
    hotspotScore: 0,
    authorCount: 0,
    hotspotCount: 0,
    knowledgeSiloCount: 0,
    sinceDays: undefined,
    shortChurnDays: undefined,
    ownershipWeight: 0,
    weightedOwnership: 0,
    classificationSet: new Set<'hotspot' | 'knowledge-silo'>(),
    churnByWeekSeries: [],
    hotspotScoreByWeekSeries: [],
  };
}

function accumulateForensics(acc: ForensicAccumulator, f: NodeForensics): void {
  acc.complexity = Math.max(acc.complexity, f.complexity ?? 0);
  acc.complexityPeak = Math.max(acc.complexityPeak, f.complexityPeak ?? 0);
  acc.cognitiveComplexity = Math.max(acc.cognitiveComplexity, f.cognitiveComplexity ?? 0);
  acc.hotspotScore = Math.max(acc.hotspotScore, f.hotspotScore ?? 0);
  acc.authorCount = Math.max(acc.authorCount, f.authorCount ?? 0);

  if (f.loc != null) {
    acc.loc += f.loc;
    acc.hasLoc = true;
  }
  if (f.sloc != null) {
    acc.sloc += f.sloc;
    acc.hasSloc = true;
  }
  acc.churn += f.churn ?? 0;
  if (f.lineChurn != null) {
    acc.lineChurn += f.lineChurn;
    acc.hasLineChurn = true;
  }
  if (f.churn30 != null) {
    acc.churn30 += f.churn30;
    acc.hasChurn30 = true;
  }
  if (f.churn365 != null) {
    acc.churn365 += f.churn365;
    acc.hasChurn365 = true;
  }

  acc.sinceDays ??= f.sinceDays;
  acc.shortChurnDays ??= f.shortChurnDays;
  acc.churnByWeekSeries.push(f.churnByWeek);
  acc.hotspotScoreByWeekSeries.push(f.hotspotScoreByWeek);

  const childChurn = f.churn ?? 0;
  if (childChurn > 0 && f.topAuthorPercent != null) {
    acc.ownershipWeight += childChurn;
    acc.weightedOwnership += f.topAuthorPercent * childChurn;
  }

  for (const c of f.classifications ?? []) {
    acc.classificationSet.add(c);
    if (c === 'hotspot') acc.hotspotCount++;
    if (c === 'knowledge-silo') acc.knowledgeSiloCount++;
  }
}

export function aggregateNodeForensics(nodes: readonly SystemNode[]): NodeForensics | undefined {
  const withForensics = nodes.filter(n => n.forensics);
  if (withForensics.length === 0) return undefined;

  const acc = createAccumulator();
  for (const node of withForensics) {
    accumulateForensics(acc, node.forensics!);
  }

  const churnByWeek = rollupChurnByWeek(acc.churnByWeekSeries);
  const hotspotScoreByWeek = rollupMaxByWeek(acc.hotspotScoreByWeekSeries);
  const topAuthorPercent =
    acc.ownershipWeight > 0 ? acc.weightedOwnership / acc.ownershipWeight : undefined;
  const authors = rollupForensicAuthors(withForensics.map(n => n.forensics!));
  const coupledFiles = rollupTopCoupledFiles(withForensics);

  return {
    complexity: acc.complexity,
    ...pickPositiveNumber('complexityPeak', acc.complexityPeak),
    ...pickPositiveNumber('cognitiveComplexity', acc.cognitiveComplexity),
    ...pickFlaggedNumber('loc', acc.hasLoc, acc.loc),
    ...pickFlaggedNumber('sloc', acc.hasSloc, acc.sloc),
    churn: acc.churn,
    ...pickFlaggedNumber('lineChurn', acc.hasLineChurn, acc.lineChurn),
    ...pickFlaggedNumber('churn30', acc.hasChurn30, acc.churn30),
    ...pickFlaggedNumber('churn365', acc.hasChurn365, acc.churn365),
    hotspotScore: acc.hotspotScore,
    authorCount: acc.authorCount,
    fileCount: withForensics.length,
    hotspotCount: acc.hotspotCount,
    knowledgeSiloCount: acc.knowledgeSiloCount,
    classifications: [...acc.classificationSet],
    ...(coupledFiles.length > 0 ? { coupledFiles } : {}),
    ...(authors.length > 0 ? { authors } : {}),
    ...(churnByWeek ? { churnByWeek } : {}),
    ...(hotspotScoreByWeek ? { hotspotScoreByWeek } : {}),
    ...pickDefinedNumber('topAuthorPercent', topAuthorPercent),
    ...pickDefinedNumber('sinceDays', acc.sinceDays),
    ...pickDefinedNumber('shortChurnDays', acc.shortChurnDays),
  };
}
