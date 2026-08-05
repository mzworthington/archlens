import {
  buildOwnershipBreakdown,
  buildRefactorBoundary,
  buildRefactorSuggestions,
  type RefactorBoundaryNodeInput,
} from '@archlens/core/forensics';
import type { NodeSafeguards, SimulationResult } from '@archlens/core/resilience';
import type { EntityRef } from '@archlens/core';
import {
  buildDiagramRecommendations,
  recommendationsForEntity,
} from '../recommendations/buildDiagramRecommendations';
import type { RankedOffender, LoadedSystemRef } from './rankOffenders';

export interface BuildRefactorPlanOptions {
  simulation?: SimulationResult | null;
  sessionSafeguards?: Partial<Record<EntityRef, NodeSafeguards>>;
}

export function collectRefactorBoundaryNodes(
  systems: readonly LoadedSystemRef[]
): RefactorBoundaryNodeInput[] {
  const nodes: RefactorBoundaryNodeInput[] = [];

  for (const system of systems) {
    for (const node of system.schema.nodes) {
      const containerId =
        typeof node.properties?.containerId === 'string' ? node.properties.containerId : undefined;
      const filepath =
        typeof node.properties?.filepath === 'string' ? node.properties.filepath : undefined;
      nodes.push({
        entityRef: node.entityRef,
        name: node.name,
        type: node.type,
        containerId,
        filepath,
        forensics: node.forensics,
      });
    }
  }

  return nodes;
}

export function buildRefactorPlanForOffender(
  offender: RankedOffender,
  systems: readonly LoadedSystemRef[],
  options: BuildRefactorPlanOptions = {}
) {
  const boundary = buildRefactorBoundary(offender.entityRef, collectRefactorBoundaryNodes(systems));
  const seedNode = systems
    .flatMap(s => s.schema.nodes)
    .find(n => n.entityRef === offender.entityRef);
  const ownerSystem = systems.find(system =>
    system.schema.nodes.some(node => node.entityRef === offender.entityRef)
  );
  const ownership = buildOwnershipBreakdown(seedNode?.forensics);
  const suggestions = boundary
    ? buildRefactorSuggestions(boundary, {
        ownership,
        seedForensics: seedNode?.forensics,
      })
    : [];
  const coupledFiles = seedNode?.forensics?.coupledFiles ?? [];

  const recommendations = ownerSystem
    ? recommendationsForEntity(
        buildDiagramRecommendations({
          schema: ownerSystem.schema,
          simulation: options.simulation,
          sessionSafeguards: options.sessionSafeguards,
          boundary,
          ownership,
        }),
        offender.entityRef,
        boundary?.memberEntityRefs
      )
    : [];

  return { boundary, ownership, suggestions, coupledFiles, recommendations };
}
