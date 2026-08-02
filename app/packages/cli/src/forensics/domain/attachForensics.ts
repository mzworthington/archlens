import type { NodeForensics, SystemNode, SystemSchema } from '@archlens/core';
import { EntityRef } from '@archlens/core';
import {
  rollupChurnByWeek,
  rollupForensicAuthors,
  rollupTopCoupledFiles,
} from '@archlens/core/forensics';
import type { FileMetrics } from './types.ts';

export function normalizeFilePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

export function fileMetricsToNodeForensics(metrics: FileMetrics): NodeForensics {
  return {
    complexity: metrics.complexity,
    ...(metrics.complexityPeak !== undefined ? { complexityPeak: metrics.complexityPeak } : {}),
    ...(metrics.cognitiveComplexity !== undefined
      ? { cognitiveComplexity: metrics.cognitiveComplexity }
      : {}),
    ...(metrics.functionCount !== undefined ? { functionCount: metrics.functionCount } : {}),
    loc: metrics.loc,
    sloc: metrics.sloc,
    churn: metrics.churn,
    ...(metrics.lineChurn !== undefined ? { lineChurn: metrics.lineChurn } : {}),
    ...(metrics.churn30 !== undefined ? { churn30: metrics.churn30 } : {}),
    ...(metrics.churn365 !== undefined ? { churn365: metrics.churn365 } : {}),
    churnByWeek: metrics.churnByWeek,
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
    ...(metrics.importedFiles && metrics.importedFiles.length > 0
      ? {
          importedFiles: metrics.importedFiles.map(i => ({
            path: i.path,
            kind: i.kind,
          })),
        }
      : {}),
    ...(metrics.sinceDays !== undefined ? { sinceDays: metrics.sinceDays } : {}),
    ...(metrics.shortChurnDays !== undefined ? { shortChurnDays: metrics.shortChurnDays } : {}),
  };
}

export function aggregateNodeForensics(nodes: readonly SystemNode[]): NodeForensics | undefined {
  const withForensics = nodes.filter(n => n.forensics);
  if (withForensics.length === 0) return undefined;

  let complexity = 0;
  let complexityPeak = 0;
  let cognitiveComplexity = 0;
  let loc = 0;
  let sloc = 0;
  let hasLoc = false;
  let hasSloc = false;
  let churn = 0;
  let lineChurn = 0;
  let hasLineChurn = false;
  let churn30 = 0;
  let churn365 = 0;
  let hasChurn30 = false;
  let hasChurn365 = false;
  let hotspotScore = 0;
  let authorCount = 0;
  let hotspotCount = 0;
  let knowledgeSiloCount = 0;
  let sinceDays: number | undefined;
  let shortChurnDays: number | undefined;
  let ownershipWeight = 0;
  let weightedOwnership = 0;
  const classificationSet = new Set<'hotspot' | 'knowledge-silo'>();
  const churnByWeekSeries: (number[] | undefined)[] = [];

  for (const node of withForensics) {
    const f = node.forensics!;
    if ((f.complexity ?? 0) > complexity) complexity = f.complexity ?? 0;
    if ((f.complexityPeak ?? 0) > complexityPeak) complexityPeak = f.complexityPeak ?? 0;
    if ((f.cognitiveComplexity ?? 0) > cognitiveComplexity) {
      cognitiveComplexity = f.cognitiveComplexity ?? 0;
    }
    if (f.loc != null) {
      loc += f.loc;
      hasLoc = true;
    }
    if (f.sloc != null) {
      sloc += f.sloc;
      hasSloc = true;
    }
    churn += f.churn ?? 0;
    if (f.lineChurn != null) {
      lineChurn += f.lineChurn;
      hasLineChurn = true;
    }
    if (f.churn30 != null) {
      churn30 += f.churn30;
      hasChurn30 = true;
    }
    if (f.churn365 != null) {
      churn365 += f.churn365;
      hasChurn365 = true;
    }
    if ((f.hotspotScore ?? 0) > hotspotScore) hotspotScore = f.hotspotScore ?? 0;
    if ((f.authorCount ?? 0) > authorCount) authorCount = f.authorCount ?? 0;
    if (sinceDays === undefined && f.sinceDays !== undefined) sinceDays = f.sinceDays;
    if (shortChurnDays === undefined && f.shortChurnDays !== undefined) {
      shortChurnDays = f.shortChurnDays;
    }
    churnByWeekSeries.push(f.churnByWeek);
    const childChurn = f.churn ?? 0;
    if (childChurn > 0 && f.topAuthorPercent != null) {
      ownershipWeight += childChurn;
      weightedOwnership += f.topAuthorPercent * childChurn;
    }
    for (const c of f.classifications ?? []) {
      classificationSet.add(c);
      if (c === 'hotspot') hotspotCount++;
      if (c === 'knowledge-silo') knowledgeSiloCount++;
    }
  }

  const churnByWeek = rollupChurnByWeek(churnByWeekSeries);
  const topAuthorPercent = ownershipWeight > 0 ? weightedOwnership / ownershipWeight : undefined;
  const authors = rollupForensicAuthors(withForensics.map(n => n.forensics!));
  const coupledFiles = rollupTopCoupledFiles(withForensics);

  return {
    complexity,
    ...(complexityPeak > 0 ? { complexityPeak } : {}),
    ...(cognitiveComplexity > 0 ? { cognitiveComplexity } : {}),
    ...(hasLoc ? { loc } : {}),
    ...(hasSloc ? { sloc } : {}),
    churn,
    ...(hasLineChurn ? { lineChurn } : {}),
    ...(hasChurn30 ? { churn30 } : {}),
    ...(hasChurn365 ? { churn365 } : {}),
    hotspotScore,
    authorCount,
    fileCount: withForensics.length,
    hotspotCount,
    knowledgeSiloCount,
    classifications: [...classificationSet],
    ...(coupledFiles.length > 0 ? { coupledFiles } : {}),
    ...(authors.length > 0 ? { authors } : {}),
    ...(churnByWeek ? { churnByWeek } : {}),
    ...(topAuthorPercent !== undefined ? { topAuthorPercent } : {}),
    ...(sinceDays !== undefined ? { sinceDays } : {}),
    ...(shortChurnDays !== undefined ? { shortChurnDays } : {}),
  };
}

export interface AttachForensicsOptions {
  /** Component nodes used to roll up container / system forensics. */
  componentNodes?: readonly SystemNode[];
}

function attachToComponentNodes(
  nodes: readonly SystemNode[],
  byPath: ReadonlyMap<string, FileMetrics>
): SystemNode[] {
  return nodes.map(node => {
    const filepath = node.properties?.filepath;
    if (typeof filepath !== 'string') return node;
    const metrics = byPath.get(normalizeFilePath(filepath));
    if (!metrics) return node;
    return { ...node, forensics: fileMetricsToNodeForensics(metrics) };
  });
}

function attachContainerRollups(
  nodes: readonly SystemNode[],
  componentNodes: readonly SystemNode[]
): SystemNode[] {
  return nodes.map(node => {
    if (node.type !== 'container') return node;
    const containerId = EntityRef.leaf(node.entityRef);
    const children = componentNodes.filter(c => {
      const cid = c.properties?.containerId;
      if (typeof cid === 'string' && cid === containerId) return true;
      try {
        return EntityRef.getParent(c.entityRef) === node.entityRef;
      } catch {
        return false;
      }
    });
    const forensics = aggregateNodeForensics(children);
    return forensics ? { ...node, forensics } : node;
  });
}

function attachSystemRollups(
  nodes: readonly SystemNode[],
  componentNodes: readonly SystemNode[]
): SystemNode[] {
  return nodes.map(node => {
    const prefix = `${node.entityRef}/`;
    const children = componentNodes.filter(
      c => c.entityRef === node.entityRef || c.entityRef.startsWith(prefix)
    );
    const forensics = aggregateNodeForensics(children);
    return forensics ? { ...node, forensics } : node;
  });
}

/**
 * Immutably attach forensics onto a schema:
 * - component level: join FileMetrics by properties.filepath
 * - container level: roll up from componentNodes
 * - context level: roll up system nodes from componentNodes under that system FQN
 */
export function attachForensicsToSchema(
  schema: SystemSchema,
  byPath: ReadonlyMap<string, FileMetrics>,
  options: AttachForensicsOptions = {}
): SystemSchema {
  const componentNodes = options.componentNodes ?? [];

  let nodes = schema.nodes;
  if (schema.level === 'component') {
    nodes = attachToComponentNodes(nodes, byPath);
  } else if (schema.level === 'container') {
    nodes = attachContainerRollups(nodes, componentNodes);
  } else if (schema.level === 'context') {
    nodes = attachSystemRollups(nodes, componentNodes);
  }

  return { ...schema, nodes };
}
