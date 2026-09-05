import { EntityRef as EntityRefUtil, type EntityRef } from '../models/entityIdentity';
import type { SystemSchema } from '../models/schema';
import type { ChaosSpecDocument } from '../resilience/chaosSpecDocument';
import {
  chaosSpecDocumentToRuntime,
  validateChaosSpecForDiagram,
} from '../resilience/chaosSpecDocument';
import type { SimulationResult } from '../resilience/simulation';
import { runResilienceSimulation } from '../resilience/simulation';
import { buildSimulationSchemaForFaults } from '../resilience/simulationSchema';
import type { LoadedSystemInput } from '../rules/workspaceExternals';
import { buildRecommendations } from './buildRecommendations';
import { compareByPriorityDesc } from './compareByPriority';
import {
  buildDefaultEstateScenarios,
  chaosSpecToEstateScenario,
  resolveDiagramEntityRef,
  type BuildEstateScenariosOptions,
  type EstateScenario,
} from './estateScenarios';
import { isEstateResilienceDiagramLevel } from './resilienceAdviceEligibility';
import type { Recommendation } from './types';

export interface LoadedDiagram {
  path: string;
  relativePath: string;
  schema: SystemSchema;
}

export interface DiagramResilienceReport {
  diagramPath: string;
  diagramRef: string;
  scenarioCount: number;
  worstOverallSla: number;
  spofCount: number;
  simulation: SimulationResult;
  recommendations: Recommendation[];
}

export interface EstateResilienceReport {
  diagrams: DiagramResilienceReport[];
  recommendations: Recommendation[];
  summary: {
    diagramCount: number;
    totalScenarios: number;
    worstOverallSla: number;
    totalSpofs: number;
    recommendationCount: number;
  };
}

export interface RunEstateResilienceOptions extends BuildEstateScenariosOptions {
  chaosSpecs?: readonly ChaosSpecDocument[];
  /** Workspace context for upstream closure and cross-diagram proxy expansion. */
  loadedSystems?: readonly LoadedSystemInput[];
}

function mergeNumericMaps(target: Map<EntityRef, number>, source: Map<EntityRef, number>): void {
  for (const [entityRef, value] of source) {
    target.set(entityRef, Math.max(target.get(entityRef) ?? 0, value));
  }
}

function mergeHeatHops(target: Map<EntityRef, number>, source: Map<EntityRef, number>): void {
  for (const [entityRef, hop] of source) {
    const existing = target.get(entityRef);
    target.set(entityRef, existing == null ? hop : Math.min(existing, hop));
  }
}

function mergeWorstCaseSimulations(results: readonly SimulationResult[]): SimulationResult | null {
  if (results.length === 0) return null;

  const heat = new Map<EntityRef, number>();
  const heatHops = new Map<EntityRef, number>();
  const integrityHeat = new Map<EntityRef, number>();
  const spofs = new Set<EntityRef>();
  const propagationStoppedAt = new Set<EntityRef>();
  const faultNodeIds = new Set<EntityRef>();
  const entryPointSlas: Record<EntityRef, number> = {};
  let worstOverallSla = 100;
  let worstOverallIntegrity = 100;

  for (const result of results) {
    mergeNumericMaps(heat, result.heat);
    mergeNumericMaps(integrityHeat, result.integrityHeat);
    mergeHeatHops(heatHops, result.heatHops);

    for (const spof of result.spofs) spofs.add(spof);
    for (const stopped of result.propagationStoppedAt) propagationStoppedAt.add(stopped);
    for (const faultId of result.faultNodeIds) faultNodeIds.add(faultId);

    worstOverallSla = Math.min(worstOverallSla, result.overallSla);
    worstOverallIntegrity = Math.min(worstOverallIntegrity, result.overallIntegrity);

    for (const [entry, sla] of Object.entries(result.entryPointSlas)) {
      entryPointSlas[entry] = Math.min(entryPointSlas[entry] ?? 100, sla);
    }
  }

  const impactedNodes = [...heat.entries()]
    .filter(([, intensity]) => intensity > 0)
    .map(([entityRef]) => entityRef);
  const integrityImpactedNodes = [...integrityHeat.entries()]
    .filter(([, intensity]) => intensity > 0)
    .map(([entityRef]) => entityRef);

  return {
    heat,
    heatHops,
    integrityHeat,
    impactedNodes,
    integrityImpactedNodes,
    entryPointSlas,
    overallSla: worstOverallSla,
    overallIntegrity: worstOverallIntegrity,
    spofs: [...spofs],
    impactedDomains: [
      ...new Set(impactedNodes.map(ref => EntityRefUtil.getImpactedDomainGroup(ref))),
    ],
    integrityImpactedDomains: [
      ...new Set(integrityImpactedNodes.map(ref => EntityRefUtil.getImpactedDomainGroup(ref))),
    ],
    advice: [],
    propagationStoppedAt: [...propagationStoppedAt],
    faultNodeIds: [...faultNodeIds],
    engine: 'typescript',
  };
}

function scenariosForDiagram(
  diagram: LoadedDiagram,
  options: RunEstateResilienceOptions
): EstateScenario[] {
  const scenarios = buildDefaultEstateScenarios(diagram.schema, options);
  const diagramRef = resolveDiagramEntityRef(diagram.schema);

  for (const document of options.chaosSpecs ?? []) {
    const validationError = validateChaosSpecForDiagram(document, diagram.schema, diagramRef);
    if (validationError) continue;

    const runtime = chaosSpecDocumentToRuntime(document);
    scenarios.push(chaosSpecToEstateScenario(document.metadata.name, runtime.spec));
  }

  return scenarios;
}

function runScenarios(
  schema: SystemSchema,
  scenarios: readonly EstateScenario[],
  loadedSystems?: readonly LoadedSystemInput[]
): SimulationResult[] {
  return scenarios.map(scenario => {
    const faultTargets = scenario.spec.faults.map(fault => fault.nodeId);
    const simulationSchema =
      loadedSystems?.length && faultTargets.length > 0
        ? buildSimulationSchemaForFaults(schema, faultTargets, [...loadedSystems]).schema
        : schema;
    return runResilienceSimulation(simulationSchema, scenario.spec);
  });
}

function emptySimulationResult(): SimulationResult {
  return {
    heat: new Map(),
    heatHops: new Map(),
    integrityHeat: new Map(),
    impactedNodes: [],
    integrityImpactedNodes: [],
    entryPointSlas: {},
    overallSla: 100,
    overallIntegrity: 100,
    spofs: [],
    impactedDomains: [],
    integrityImpactedDomains: [],
    advice: [],
    propagationStoppedAt: [],
    faultNodeIds: [],
    engine: 'typescript',
  };
}

export function runEstateResilienceForDiagram(
  diagram: LoadedDiagram,
  options: RunEstateResilienceOptions = {}
): DiagramResilienceReport | null {
  const resilienceEligible = isEstateResilienceDiagramLevel(diagram.schema.level);
  const scenarios = resilienceEligible ? scenariosForDiagram(diagram, options) : [];

  if (resilienceEligible && scenarios.length === 0) return null;

  let merged: SimulationResult | null = null;
  if (scenarios.length > 0) {
    const simulationResults = runScenarios(diagram.schema, scenarios, options.loadedSystems);
    merged = mergeWorstCaseSimulations(simulationResults);
    if (!merged) return null;
  }

  const recommendations = buildRecommendations({
    schema: diagram.schema,
    simulation: merged,
  });

  if (!merged && recommendations.length === 0) return null;

  const simulation = merged ?? emptySimulationResult();

  return {
    diagramPath: diagram.relativePath,
    diagramRef: resolveDiagramEntityRef(diagram.schema),
    scenarioCount: scenarios.length,
    worstOverallSla: simulation.overallSla,
    spofCount: simulation.spofs.length,
    simulation,
    recommendations,
  };
}

export function runEstateResilience(
  diagrams: readonly LoadedDiagram[],
  options: RunEstateResilienceOptions = {}
): EstateResilienceReport {
  const diagramReports: DiagramResilienceReport[] = [];
  let totalScenarios = 0;

  for (const diagram of diagrams) {
    const report = runEstateResilienceForDiagram(diagram, options);
    if (!report) continue;
    diagramReports.push(report);
    totalScenarios += report.scenarioCount;
  }

  const recommendations = [...diagramReports.flatMap(report => report.recommendations)].sort(
    compareByPriorityDesc
  );

  const worstOverallSla =
    diagramReports.length > 0
      ? Math.min(...diagramReports.map(report => report.worstOverallSla))
      : 100;
  const totalSpofs = diagramReports.reduce((sum, report) => sum + report.spofCount, 0);

  return {
    diagrams: diagramReports,
    recommendations,
    summary: {
      diagramCount: diagramReports.length,
      totalScenarios,
      worstOverallSla,
      totalSpofs,
      recommendationCount: recommendations.length,
    },
  };
}
